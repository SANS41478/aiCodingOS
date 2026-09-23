# Patterns & Templates

组件之上建立可复用的页面模式。Pattern 不能只是一张截图，必须说明输入、状态、响应式行为和组件组合。

## Authentication

```text
Authentication
├── Login
├── Signup
├── Forgot Password
└── Verification
```

## Dashboard

```text
Dashboard
├── Header
├── Sidebar
├── Content
└── Widget
```

## Search

```text
Search
├── Search Input
├── Filters
├── Results
└── Pagination
```

## Templates

### Dashboard Template

```text
Header
Sidebar
Main
 ├── Page Header
 ├── Filters
 ├── Content
 └── Footer
```

### Detail Page Template

```text
Header
Hero
Content
Related
Footer
```

新增 Pattern 或 Template 时，必须说明适用场景、非适用场景、响应式变化和空/加载/错误状态。
