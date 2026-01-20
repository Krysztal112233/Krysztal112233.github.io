---
title: 编译器笔记：CST
date: 2025-05-19 01:22:04
tags:
  - 笔记
  - 学习
  - 技术
categories:
  - 编译器/解析器
---

AST(Abstract Syntax Tree) 倒是想做编译器的人、不想做编译器的人都会知道一点，但是
CST(Concrete Syntax Tree) 倒是很少提到，睡不着就简单记录一下吧

<!-- more -->

## 有了 AST 为啥还要 CST？

AST
侧重于表达内容核心结构，他会忽略基本上所有除了内容核心结构以外的所有内容包括：

- 空格
- tag 类型
  - 各种括号
  - 各种引号
- 关键字
- 分号

只会保存核心内容，由于抛弃了以上内容，基于 AST
可以做我们更耳熟能详并且高级的操作：

- 语义分析
- 优化
- 代码生成

等等等，还有更多。

那么他的缺陷是什么？由于忽略了**空格**，我们没有办法从 AST
直接还原文本————我们失去了原先的对应上文本的信息。

那么基于`我们需要还原文本`这个前提条件，我们就需要引入完整保存信息了的新的结构，他既可以还原成为原文本，也可以降级
(`Lowering`) 成为 AST便于后续处理

这个时候，CST 就出现了。

## CST，为什么能还原文本？

为了简单，我们直接画两张图来说明区别就好

我们假定有如下的表达式

```c
a = (b + c) * d;
```

那么我们的 AST 长这样：

```prolog
Assign
└── LHS: "a"
└── RHS:
      Multiply
      ├── Add("b", "c")
      └── "d"
```

我们的 CST 就长这样：

```prolog
Assign
└── LHS: Identifier("a")
└── Operator("=")
└── RHS:
│    Multiply
│     ├── Parentheses
│     │   └── Add
│     │       ├── Identifier("b")
│     │       └── Identifier("c")
│     └── Identifier("d")
└── Semicolon
```

可以清晰的看到，CST 多了很多东西，他是可以被 **Lowering** 到 AST 的

不过为了画起来方便我没画空格，空格实际上也是包含在其中的 :)
