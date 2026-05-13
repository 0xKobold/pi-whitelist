import { parseRuleString, serializeRuleString } from './rules/parser.js';
import { MatcherRegistry } from './matchers/registry.js';
import { CommandMatcher } from './matchers/command-matcher.js';
import { FileMatcher } from './matchers/file-matcher.js';
import { MemorySettingsStore } from './storage/memory-store.js';
import { isReadOnly } from './readonly.js';
import { SOURCE_PRECEDENCE } from './constants.js';
export class PermissionManager {
    _mode;
    registry;
    cache = new Map();
    inMemoryRules = new Map();
    additionalWorkingDirectories;
    isBypassPermissionsModeAvailable;
    shouldAvoidPermissionPrompts;
    constructor(options = {}) {
        // Store is available for future async loading; MemorySettingsStore is default
        void (options.store ?? new MemorySettingsStore());
        this._mode = options.mode ?? 'default';
        this.registry = new MatcherRegistry();
        this.registry.register(new CommandMatcher());
        this.registry.register(new FileMatcher());
        this.additionalWorkingDirectories = new Map([...(options.additionalWorkingDirectories ?? [])].map(([k, v]) => [k, { path: k, source: v }]));
        this.isBypassPermissionsModeAvailable = options.isBypassPermissionsModeAvailable ?? false;
        this.shouldAvoidPermissionPrompts = options.shouldAvoidPermissionPrompts ?? false;
    }
    invalidateCache() {
        this.cache.clear();
    }
    getContext() {
        return {
            mode: this._mode,
            additionalWorkingDirectories: new Map(this.additionalWorkingDirectories),
            alwaysAllowRules: this.getRulesByBehavior('allow'),
            alwaysDenyRules: this.getRulesByBehavior('deny'),
            alwaysAskRules: this.getRulesByBehavior('ask'),
            isBypassPermissionsModeAvailable: this.isBypassPermissionsModeAvailable,
            shouldAvoidPermissionPrompts: this.shouldAvoidPermissionPrompts,
        };
    }
    check(input) {
        const cacheKey = `${input.toolName}:${input.ruleContent ?? '*'}:${input.workingDirectory ?? '*'}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        const decision = this.evaluate(input);
        this.cache.set(cacheKey, decision);
        return decision;
    }
    evaluate(input) {
        if (this._mode === 'bypassPermissions') {
            return this.buildAllow(input, { type: 'mode', mode: 'bypassPermissions' });
        }
        if (this._mode === 'acceptEdits') {
            const isEdit = ['FileEdit', 'FileWrite'].includes(input.toolName);
            if (isEdit) {
                return this.buildAllow(input, { type: 'mode', mode: 'acceptEdits' });
            }
        }
        if (this._mode === 'dontAsk') {
            const denyResult = this.findMatchingRule(input, 'deny');
            if (denyResult) {
                return this.buildDeny(input, { type: 'rule', rule: denyResult });
            }
            return this.buildAllow(input, { type: 'mode', mode: 'dontAsk' });
        }
        const denyResult = this.findMatchingRule(input, 'deny');
        if (denyResult) {
            return this.buildDeny(input, { type: 'rule', rule: denyResult });
        }
        const allowResult = this.findMatchingRule(input, 'allow');
        if (allowResult) {
            return this.buildAllow(input, { type: 'rule', rule: allowResult });
        }
        const askResult = this.findMatchingRule(input, 'ask');
        if (askResult) {
            return this.buildAsk(input, `${input.toolName}: ${input.ruleContent ?? 'any'}`, { type: 'rule', rule: askResult });
        }
        if (this._mode === 'plan') {
            return this.buildAsk(input, `Plan mode: ${input.toolName}`, { type: 'mode', mode: 'plan' });
        }
        if (isReadOnly(input.toolName)) {
            return this.buildAllow(input, { type: 'other', reason: 'read-only-tool' });
        }
        return this.buildAsk(input, `${input.toolName}: ${input.ruleContent ?? 'any'}`);
    }
    findMatchingRule(input, behavior) {
        const rulesMap = this.getRulesByBehavior(behavior);
        for (const source of [...SOURCE_PRECEDENCE].reverse()) {
            const rules = rulesMap[source] ?? [];
            for (const ruleString of rules) {
                const ruleValue = parseRuleString(ruleString);
                if (ruleValue.toolName !== input.toolName)
                    continue;
                const matcher = this.registry.get(input.toolName);
                if (matcher.matches(ruleValue.ruleContent, input.ruleContent)) {
                    return { source, ruleBehavior: behavior, ruleValue };
                }
            }
        }
        for (const [source, rules] of this.inMemoryRules) {
            const ruleList = rules[behavior] ?? [];
            for (const ruleString of ruleList) {
                const ruleValue = parseRuleString(ruleString);
                if (ruleValue.toolName !== input.toolName)
                    continue;
                const matcher = this.registry.get(input.toolName);
                if (matcher.matches(ruleValue.ruleContent, input.ruleContent)) {
                    return { source: source, ruleBehavior: behavior, ruleValue };
                }
            }
        }
        return null;
    }
    getRulesByBehavior(behavior) {
        const result = {};
        for (const [source, rules] of this.inMemoryRules) {
            const ruleList = rules[behavior];
            if (ruleList && ruleList.length > 0) {
                result[source] = [...ruleList];
            }
        }
        return result;
    }
    buildAllow(_input, reason) {
        return {
            behavior: 'allow',
            decisionReason: reason,
        };
    }
    buildDeny(_input, reason) {
        return {
            behavior: 'deny',
            message: `Permission denied for ${_input.toolName}: ${_input.ruleContent ?? 'any'}`,
            decisionReason: reason,
        };
    }
    buildAsk(input, message, reason) {
        return {
            behavior: 'ask',
            message,
            ...(reason ? { decisionReason: reason } : {}),
            suggestions: [
                {
                    type: 'addRules',
                    destination: 'session',
                    rules: [{ toolName: input.toolName, ruleContent: input.ruleContent }],
                    behavior: 'allow',
                },
            ],
        };
    }
    addRule(rule, behavior, source) {
        const serialized = serializeRuleString(rule);
        if (!this.inMemoryRules.has(source)) {
            this.inMemoryRules.set(source, { allow: [], deny: [], ask: [] });
        }
        const rules = this.inMemoryRules.get(source);
        rules[behavior].push(serialized);
        this.invalidateCache();
    }
    removeRule(rule, behavior, source) {
        const serialized = serializeRuleString(rule);
        if (!this.inMemoryRules.has(source))
            return;
        const rules = this.inMemoryRules.get(source);
        const index = rules[behavior].indexOf(serialized);
        if (index !== -1) {
            rules[behavior].splice(index, 1);
        }
        this.invalidateCache();
    }
    setMode(mode) {
        this._mode = mode;
        this.invalidateCache();
    }
    addDirectory(path, source) {
        this.additionalWorkingDirectories.set(path, { path, source });
        this.invalidateCache();
    }
    removeDirectory(path) {
        this.additionalWorkingDirectories.delete(path);
        this.invalidateCache();
    }
    applyUpdates(updates) {
        for (const update of updates) {
            this.applyUpdate(update);
        }
        this.invalidateCache();
    }
    applyUpdate(update) {
        switch (update.type) {
            case 'setMode':
                this._mode = update.mode;
                break;
            case 'addRules':
                for (const rule of update.rules) {
                    this.addRule(rule, update.behavior, update.destination);
                }
                break;
            case 'removeRules':
                for (const rule of update.rules) {
                    this.removeRule(rule, update.behavior, update.destination);
                }
                break;
            case 'replaceRules': {
                const source = update.destination;
                this.inMemoryRules.set(source, { allow: [], deny: [], ask: [] });
                for (const rule of update.rules) {
                    this.addRule(rule, update.behavior, source);
                }
                break;
            }
            case 'addDirectories':
                for (const dir of update.directories) {
                    this.addDirectory(dir, 'session');
                }
                break;
            case 'removeDirectories':
                for (const dir of update.directories) {
                    this.removeDirectory(dir);
                }
                break;
        }
    }
    isBashAllowed(command) {
        const decision = this.check({ toolName: 'Bash', ruleContent: command });
        return decision.behavior === 'allow';
    }
    isFileEditAllowed(filePath) {
        const decision = this.check({ toolName: 'FileEdit', ruleContent: filePath });
        return decision.behavior === 'allow';
    }
    getRulesForTool(toolName) {
        const rules = [];
        for (const behavior of ['allow', 'deny', 'ask']) {
            const rulesMap = this.getRulesByBehavior(behavior);
            for (const [source, ruleStrings] of Object.entries(rulesMap)) {
                for (const ruleString of ruleStrings ?? []) {
                    const ruleValue = parseRuleString(ruleString);
                    if (ruleValue.toolName === toolName) {
                        rules.push({ source: source, ruleBehavior: behavior, ruleValue });
                    }
                }
            }
        }
        return rules;
    }
    getRulesFromSource(source) {
        const rules = [];
        const rulesFromSource = this.inMemoryRules.get(source);
        if (!rulesFromSource)
            return rules;
        for (const behavior of ['allow', 'deny', 'ask']) {
            const ruleStrings = rulesFromSource[behavior];
            for (const ruleString of ruleStrings) {
                rules.push({
                    source,
                    ruleBehavior: behavior,
                    ruleValue: parseRuleString(ruleString),
                });
            }
        }
        return rules;
    }
}
//# sourceMappingURL=manager.js.map