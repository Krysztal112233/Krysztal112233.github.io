---
title: Paradoxical 札记
date: 2025-05-12 23:35:48
tags:
  - 技术
  - 捣鼓
  - 设计
  - PoC
---

最近把 neorg 作为笔记和规划系统有点上头，但苦于没一个好用的
`Language Server`，自己又对编译器前端方面略有了解于是决定写下这篇大概会持续更新的札记

<!-- more -->

我们的最终目的是实现一个不错的 `Language Server` 并且可以在 `neovim/helix`
上跑起来

为什么是 `neovim/helix` 呢？因为我暂时不会继续用 VSCode 了

## 流水线设计

考虑到我希望 paradoxical 有如下两个功能

- 重新格式化 neorg 文档
- 良好的补全

因此我决定采用如下流水线设计：

```
Text  →  Lexer (RawTokenKind)  →  CST  →  Typed AST/HIR  →  Semantic Analysis  →  LSP Server  →  Editor
| src |     Lazy Lexer         |  CST  |                 AST                   |
```

需要着重说明的是，我们使用 rope
来保存和编辑源文件，这样我们所有的操作的时间复杂度都是 $O(logN)$

## 目标

### 阶段 0

{% note success %}

该阶段起始于 **_2025-05-16_**

{% endnote %}

在阶段 0 需要实现最基本的功能：解析

但由于 neorg 的格式内容较多所以在这个阶段只考虑实现一个子集

- 标题
- 有序/无序列表
- 文本段
  - 文本类型 `Paragraph`：这种类型允许使用 neorg 的修饰符例如 `{}` `//` `$||$`
    等，这些修饰符可以正常执行其对应的功能
  - 逐字类型 `VerbatimParagrah`: 这种类型的文本段不会处理 neorg
    的修饰符，所有输入的修饰符都应该原样输出
- 标签 `Tag`

{% note info %}

请注意，由于 neorg 设计上要求的**_非歧义_**解析，所有解析失败的内容都应该回归为
`文本类型 Paragraph`

{% endnote %}

#### `Token` 设计

基于 Token 的功能和现在的目标，我设计出如下的 `RawTokenKind`

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RawTokenKind {
    Punct(char),
    NormalChar(char),
    Tag,
    Linending(LinendingKind),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LinendingKind {
    LF,
    CRLF,
}
```

以上的代码省略了对于 `Display` trait 的实现

#### `Token` 解析规则

我们使用 [`nom`](https://github.com/rust-bakery/nom) 这个库来实现解析，因为
neorg 的文档风格非常适合使用组合子解析器的方式进行解析。

不自己编写递归下降解析器是因为 neorg 的规范实际上比较简单，而且 neorg
的二义性情况很容易被判断，因此我们直接使用组合子解析器来实现解析就好

由于我们需要**保留** Token 在文档里的位置信息，因此基于 `RawTokenKind` 派生出
`RawToken`，添加 `span` 字段保留当前 Token 的在文档里的位置信息（以偏移表示）

```rust
#[derive(Debug, Clone)]
pub struct RawToken {
    pub kind: RawTokenKind,
    pub span: Range<usize>,
}
```

接下来我们开始编写对于几个类型 Token 的组合子

```rust
pub const AVAILIABLE_PUNCT: &[char] = &['(', ')', '-', '~', '*', '/', '{', '}', '[', ']'];

fn parse_punct(input: Span) -> IResult<Span, RawToken> {
    let (input, pos) = position(input)?;
    let (input, matched) = nom::character::complete::one_of(AVAILIABLE_PUNCT)(input)?;

    let token = RawToken {
        kind: RawTokenKind::Punct(matched),
        span: pos.location_offset()..(pos.location_offset() + matched.len_utf8()),
    };

    Ok((input, token))
}

fn parse_normal_char(input: Span) -> IResult<Span, RawToken> {
    let (input, pos) = position(input)?;
    let (input, matched) = nom::character::complete::satisfy(|c| {
        !AVAILIABLE_PUNCT.contains(&c) && c != '@' && c != '\n' && c != '\r'
    })(input)?;

    let token = RawToken {
        kind: RawTokenKind::NormalChar(matched),
        span: pos.location_offset()..(pos.location_offset() + matched.len_utf8()),
    };

    Ok((input, token))
}

fn parse_tag(input: Span) -> IResult<Span, RawToken> {
    let (input, pos) = position(input)?;
    let (input, matched) = nom::character::complete::char('@')(input)?;

    let token = RawToken {
        kind: RawTokenKind::Tag,
        span: pos.location_offset()..(pos.location_offset() + matched.len_utf8()),
    };

    Ok((input, token))
}

fn parse_linending(input: Span) -> IResult<Span, RawToken> {
    let (input, pos) = position(input)?;
    let (input, ending) = nom::branch::alt((
        nom::combinator::map(nom::bytes::complete::tag("\n"), |_| LinendingKind::LF),
        nom::combinator::map(nom::bytes::complete::tag("\r\n"), |_| LinendingKind::CRLF),
    ))
    .parse(input)?;

    let token = RawToken {
        kind: RawTokenKind::Linending(ending),
        span: pos.location_offset()..(pos.location_offset() + ending.to_string().len()),
    };

    Ok((input, token))
}
```

- 对于 `RawTokenKind::Tag` 我们直接提取 `@` 字符就好
- 对于 `RawTokenKind::Linending` 我们需要判断并且保留文档里的换行符类型
  - `\n`：UNIX 平台所使用的换行符
  - `\r\n`：Windows 平台所使用的换行符
- 对于其他的标点符号，我们引入一个常量 `AVAILIABLE_PUNCT` 表示可以出现在
  `RawTokenKind::Punct` 内的字符（相当于白名单）
- 如果在以上情况之外，则归类为 `RawTokenKind::NormalChar`

因此，我们可以总结出如下的 lexer

```rust
let rope = Rope::from_str(source);
let mut tokens = Vec::new();
let mut input = Span::new(source);

let mut parsers = nom::branch::alt((
    Self::parse_tag,
    Self::parse_linending,
    Self::parse_punct,
    Self::parse_normal_char,
));

while !input.fragment().is_empty() {
    let Ok((rest, token)) = parsers.parse(input) else {
        return Err(error::Error::Lexer);
    };

    tokens.push(token);
    input = rest;
}

Ok(Self { text: rope, tokens })
```

单元测试也是不可少的一部分，因为包括对于中文的解析是略微麻烦也需要验证的

{% spoiler %}

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::token::{LinendingKind, RawTokenKind};

    #[test]
    fn test_raw_document_parsing() {
        let input = "@hello\n-world\r\n";
        let doc = RawDocument::new(input).expect("Failed to parse document");

        let expected = vec![
            RawToken {
                kind: RawTokenKind::Tag,
                span: 0..1,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('h'),
                span: 1..2,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('e'),
                span: 2..3,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('l'),
                span: 3..4,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('l'),
                span: 4..5,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('o'),
                span: 5..6,
            },
            RawToken {
                kind: RawTokenKind::Linending(LinendingKind::LF),
                span: 6..7,
            },
            RawToken {
                kind: RawTokenKind::Punct('-'),
                span: 7..8,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('w'),
                span: 8..9,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('o'),
                span: 9..10,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('r'),
                span: 10..11,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('l'),
                span: 11..12,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('d'),
                span: 12..13,
            },
            RawToken {
                kind: RawTokenKind::Linending(LinendingKind::CRLF),
                span: 13..15,
            },
        ];

        assert_eq!(doc.tokens, expected);
    }

    #[test]
    fn test_raw_document_parsing_with_chinese() {
        let input = "@你好\n-世界\r\n";
        let doc = RawDocument::new(input).expect("Failed to parse document");

        let expected = vec![
            RawToken {
                kind: RawTokenKind::Tag,
                span: 0..1,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('你'),
                span: 1..4,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('好'),
                span: 4..7,
            },
            RawToken {
                kind: RawTokenKind::Linending(LinendingKind::LF),
                span: 7..8,
            },
            RawToken {
                kind: RawTokenKind::Punct('-'),
                span: 8..9,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('世'),
                span: 9..12,
            },
            RawToken {
                kind: RawTokenKind::NormalChar('界'),
                span: 12..15,
            },
            RawToken {
                kind: RawTokenKind::Linending(LinendingKind::CRLF),
                span: 15..17,
            },
        ];

        assert_eq!(doc.tokens, expected);
    }
}
```

{% endspoiler %}
