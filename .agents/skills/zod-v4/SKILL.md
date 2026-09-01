---
name: zod-v4
description: Comprehensive reference and best-practice guide for Zod v4 syntax. Covers modern non-deprecated patterns, unified error handling, top-level string formats, codecs, transforms, refinements, and migration from Zod v3.
---

# 🛡️ Zod v4 Guide & Syntax Reference

This skill provides authoritative guidance on writing modern, idiomatic, and non-deprecated **Zod v4** schemas.

---

## 1. Key Highlights of Zod v4

- **High Performance:** Up to 14x faster string parsing and significantly faster TypeScript compiler checking.
- **Unified Error Handling:** Dropped legacy fragmented error parameters in favor of a single `{ error: ... }` parameter.
- **Top-Level String Formats:** Promoted formats (`z.email()`, `z.uuid()`, `z.url()`, `z.datetime()`) to top-level functions for superior tree-shaking.
- **`zod/mini` Architecture:** Lightweight functional wrapper build for ultra-compact bundle sizes.
- **TypeScript Requirement:** Requires **TypeScript 5.5+**.

---

## 2. Deprecated vs. Modern Non-Deprecated Syntax Cheat Sheet

| Feature | ❌ Deprecated / Removed (Zod v3) | ✅ Modern Non-Deprecated (Zod v4) |
| :--- | :--- | :--- |
| **Custom Error Message** | `z.string({ required_error: "Required", invalid_type_error: "Must be string" })` | `z.string({ error: "Must be a valid string" })` |
| **Email Validation** | `z.string().email("Invalid email")` or `{ message: "..." }` | `z.email({ error: "Invalid email format" })` (or `z.email()`) |
| **UUID Validation** | `z.string().uuid()` | `z.uuid({ error: "Invalid UUID" })` |
| **URL Validation** | `z.string().url()` | `z.url({ error: "Invalid URL" })` |
| **DateTime Validation** | `z.string().datetime()` | `z.datetime({ error: "Invalid ISO datetime" })` |
| **Min/Max Length** | `z.string().min(5, { message: "Too short" })` | `z.string().min(5, { error: "Minimum 5 characters required" })` |
| **Number Range** | `z.number().positive({ message: "Must be > 0" })` | `z.number().positive({ error: "Must be positive" })` |
| **Dynamic Error Function** | `z.string({ errorMap: (issue, ctx) => ... })` | `z.string({ error: (issue) => `Invalid value: ${issue.code}` })` |

---

## 3. Core Primitives & Schema Construction

```typescript
import { z } from "zod";

// Primitives
const nameSchema = z.string({ error: "Name is required" }).min(2).max(100);
const ageSchema = z.number({ error: "Age must be a number" }).int().min(0).max(150);
const isActiveSchema = z.boolean();
const tagsSchema = z.array(z.string()).min(1, { error: "At least one tag required" });

// Top-Level Formats (Tree-shakeable)
const emailSchema = z.email({ error: "Invalid email address" });
const uuidSchema = z.uuid({ error: "Invalid UUID format" });
const urlSchema = z.url({ error: "Invalid URL format" });
const isoDateSchema = z.datetime({ error: "Must be valid ISO timestamp" });

// Enums & Literals
const roleEnum = z.enum(["ADMIN", "ENGINEER", "PROCUREMENT", "VIEWER"], {
  error: "Invalid role specified",
});
const statusLiteral = z.literal("ACTIVE");

// Optional & Nullable
const middleNameSchema = z.string().optional(); // string | undefined
const notesSchema = z.string().nullable();       // string | null
const nullishSchema = z.string().nullish();     // string | null | undefined
```

---

## 4. Object Schemas & Modifiers

```typescript
// Standard Object
export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().min(1),
  role: roleEnum.default("VIEWER"),
  createdAt: z.datetime().optional(),
});

// Object Operations
const PartialUserSchema = UserSchema.partial(); // All fields optional
const RequiredUserSchema = UserSchema.required(); // All fields required
const PickUserSchema = UserSchema.pick({ id: true, email: true });
const OmitUserSchema = UserSchema.omit({ role: true });
const ExtendedUserSchema = UserSchema.extend({
  department: z.string(),
  clearanceLevel: z.number().int().min(1).max(5),
});

// Strict / Passthrough
const StrictUser = UserSchema.strict(); // Disallows extra unrecognized keys
const PassthroughUser = UserSchema.passthrough(); // Preserves unrecognized keys
```

---

## 5. Discriminated Unions (High-Performance Polymorphism)

Always prefer `z.discriminatedUnion` over `z.union` for tagged object types:

```typescript
export const ProcurementActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("APPROVE_PO"),
    poNumber: z.string(),
    approverId: z.uuid(),
    allocatedBudget: z.number().positive(),
  }),
  z.object({
    actionType: z.literal("REJECT_PO"),
    poNumber: z.string(),
    reason: z.string().min(10, { error: "Rejection reason must be detailed" }),
  }),
  z.object({
    actionType: z.literal("EXPEDITE_PO"),
    poNumber: z.string(),
    targetDeliveryDate: z.datetime(),
    expediteFeeAgreed: z.boolean(),
  }),
]);
```

---

## 6. Coercion, Transforms & Pipelines

### Coercion (`z.coerce.*`)
Converts raw inputs (e.g., query params, form data strings) to proper types:

```typescript
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeArchived: z.coerce.boolean().default(false),
});
```

### Pipelines (`.pipe()`) and Transforms (`.transform()`)
```typescript
// String -> Number -> Trimmed output
const numericIdSchema = z.string()
  .pipe(z.coerce.number().int().positive());

// Sanitization & normalization
const sanitizedEmail = z.email()
  .transform((val) => val.trim().toLowerCase());

// Parsing JSON strings
const jsonPayloadSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid JSON string payload",
    });
    return z.NEVER;
  }
});
```

---

## 7. Refinements & Custom Validation

```typescript
// Simple Cross-field Refinement
export const DateRangeSchema = z.object({
  startDate: z.datetime(),
  endDate: z.datetime(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  error: "endDate must be on or after startDate",
  path: ["endDate"], // Points error specifically to endDate field
});

// Advanced .superRefine() for Multi-Issue Reporting
export const SemiconductorOrderSchema = z.object({
  partCategory: z.enum(["Wafer", "Chemical", "Wire"]),
  quantity: z.number().positive(),
  cleanroomCertified: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.partCategory === "Wafer" && data.quantity > 500 && !data.cleanroomCertified) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wafer orders exceeding 500 units require Cleanroom Certification.",
      path: ["cleanroomCertified"],
    });
  }
});
```

---

## 8. TypeScript Type Inference

Always extract TypeScript types directly from schemas to avoid redundant interface definitions:

```typescript
// Infer Output Type (Post-transformation)
export type User = z.infer<typeof UserSchema>;

// Infer Input Type (Pre-transformation / Coercion)
export type UserInput = z.input<typeof UserSchema>;

// Infer Output Type (Explicit alias)
export type UserOutput = z.output<typeof UserSchema>;
```

---

## 9. Express.js Middleware Validation Pattern (Zod v4)

```typescript
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const validateRequest = <T extends z.ZodTypeAny>(schema: T) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          issues: err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(err);
    }
  };
};
```

---

## 10. Zod v4 Best Practices Checklist

- [x] Use `{ error: "..." }` instead of `{ message: "..." }` or `{ required_error: "..." }`.
- [x] Use top-level `z.email()`, `z.uuid()`, `z.url()`, `z.datetime()` for tree-shakability.
- [x] Use `z.discriminatedUnion()` for tagged unions.
- [x] Use `.superRefine()` when errors depend on multiple fields.
- [x] Use `z.coerce.*` strictly on un-typed inputs like URL params and query strings.
- [x] Use `z.infer<typeof Schema>` as the single source of truth for TypeScript types.
