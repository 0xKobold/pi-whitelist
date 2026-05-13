import { z } from 'zod';
export declare const permissionBehaviorSchema: z.ZodEnum<["allow", "deny", "ask"]>;
export declare const permissionRuleValueSchema: z.ZodObject<{
    toolName: z.ZodString;
    ruleContent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    toolName: string;
    ruleContent?: string | undefined;
}, {
    toolName: string;
    ruleContent?: string | undefined;
}>;
export declare const permissionRuleSchema: z.ZodObject<{
    source: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings", "cliArg", "command", "session"]>;
    ruleBehavior: z.ZodEnum<["allow", "deny", "ask"]>;
    ruleValue: z.ZodObject<{
        toolName: z.ZodString;
        ruleContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        ruleContent?: string | undefined;
    }, {
        toolName: string;
        ruleContent?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    source: "userSettings" | "projectSettings" | "localSettings" | "flagSettings" | "policySettings" | "cliArg" | "command" | "session";
    ruleBehavior: "allow" | "deny" | "ask";
    ruleValue: {
        toolName: string;
        ruleContent?: string | undefined;
    };
}, {
    source: "userSettings" | "projectSettings" | "localSettings" | "flagSettings" | "policySettings" | "cliArg" | "command" | "session";
    ruleBehavior: "allow" | "deny" | "ask";
    ruleValue: {
        toolName: string;
        ruleContent?: string | undefined;
    };
}>;
export declare const permissionModeSchema: z.ZodEnum<["acceptEdits", "bypassPermissions", "default", "dontAsk", "plan"]>;
export declare const permissionUpdateSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"addRules">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    rules: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        ruleContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        ruleContent?: string | undefined;
    }, {
        toolName: string;
        ruleContent?: string | undefined;
    }>, "many">;
    behavior: z.ZodEnum<["allow", "deny", "ask"]>;
}, "strip", z.ZodTypeAny, {
    type: "addRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}, {
    type: "addRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}>, z.ZodObject<{
    type: z.ZodLiteral<"replaceRules">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    rules: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        ruleContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        ruleContent?: string | undefined;
    }, {
        toolName: string;
        ruleContent?: string | undefined;
    }>, "many">;
    behavior: z.ZodEnum<["allow", "deny", "ask"]>;
}, "strip", z.ZodTypeAny, {
    type: "replaceRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}, {
    type: "replaceRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}>, z.ZodObject<{
    type: z.ZodLiteral<"removeRules">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    rules: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        ruleContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        ruleContent?: string | undefined;
    }, {
        toolName: string;
        ruleContent?: string | undefined;
    }>, "many">;
    behavior: z.ZodEnum<["allow", "deny", "ask"]>;
}, "strip", z.ZodTypeAny, {
    type: "removeRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}, {
    type: "removeRules";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    rules: {
        toolName: string;
        ruleContent?: string | undefined;
    }[];
    behavior: "allow" | "deny" | "ask";
}>, z.ZodObject<{
    type: z.ZodLiteral<"setMode">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    mode: z.ZodEnum<["acceptEdits", "bypassPermissions", "default", "dontAsk", "plan"]>;
}, "strip", z.ZodTypeAny, {
    mode: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan";
    type: "setMode";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
}, {
    mode: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan";
    type: "setMode";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
}>, z.ZodObject<{
    type: z.ZodLiteral<"addDirectories">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    directories: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "addDirectories";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    directories: string[];
}, {
    type: "addDirectories";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    directories: string[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"removeDirectories">;
    destination: z.ZodEnum<["userSettings", "projectSettings", "localSettings", "session", "cliArg"]>;
    directories: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "removeDirectories";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    directories: string[];
}, {
    type: "removeDirectories";
    destination: "userSettings" | "projectSettings" | "localSettings" | "cliArg" | "session";
    directories: string[];
}>]>;
export declare const permissionSettingsSchema: z.ZodObject<{
    permissions: z.ZodObject<{
        defaultMode: z.ZodOptional<z.ZodEnum<["acceptEdits", "bypassPermissions", "default", "dontAsk", "plan"]>>;
        allow: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        deny: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        ask: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Path glob patterns to deny for Read/Edit/Write tools. Expanded into deny rules on load. */
        denyPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        additionalDirectories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        allow: string[];
        deny: string[];
        ask: string[];
        denyPaths: string[];
        additionalDirectories: string[];
        defaultMode?: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan" | undefined;
    }, {
        allow?: string[] | undefined;
        deny?: string[] | undefined;
        ask?: string[] | undefined;
        defaultMode?: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan" | undefined;
        denyPaths?: string[] | undefined;
        additionalDirectories?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    permissions: {
        allow: string[];
        deny: string[];
        ask: string[];
        denyPaths: string[];
        additionalDirectories: string[];
        defaultMode?: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan" | undefined;
    };
}, {
    permissions: {
        allow?: string[] | undefined;
        deny?: string[] | undefined;
        ask?: string[] | undefined;
        defaultMode?: "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan" | undefined;
        denyPaths?: string[] | undefined;
        additionalDirectories?: string[] | undefined;
    };
}>;
//# sourceMappingURL=schemas.d.ts.map