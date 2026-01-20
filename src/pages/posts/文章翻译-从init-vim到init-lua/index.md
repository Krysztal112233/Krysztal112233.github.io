---
title: "文章翻译:从init.vim到init.lua"
date: 2021-12-20 21:41:36
tags:
  - 搬运
  - 翻译
  - 文章
---

原文链接：[5 分钟速成课程：从 init.vim 到 init.lua，释放 Neovim 0.5 的威力!](https://www.notonlycode.org/neovim-lua-config/)

<!--more-->

今年早些时候，Neovim 的维护者们发布了 0.5 版本。除了很多其他的功能，这个版本有一个很重大的新功能：允许用户使用 Lua 语言配置他们的 Neovim 编辑器。

在这篇文章我会分享一些关于如何从由 VimL 编写的配置文件搬家到由 Lua 编写的配置文件的基础规则。这不是一个完整的指南，但是他覆盖了我转移我的 init.vim 转移到 init.lua 所需要用到的几乎 100% 的知识。

在文章的底部，你还可以找到我的配置文件的链接，你可以把他们当作你学习的例子。如果需要的话，你可以复制他们。

## 1 分钟速成 Lua

首先，最好花 10-15 分钟学习 Lua，以便轻松编写新配置。我是在“[在 Y 分钟内学习 X](https://learnxinyminutes.com/docs/lua/)”网站借鉴的 Lua 例子，我觉得他们能完全工作。如果你想用一分钟的时间学会 Lua 语言，来看看下面这个例子：

```lua
-- 这是一个注释
num = 22 -- 这是一个声明了number类型的全局变量
local num2 = 33 -- 本地变量
str1 = 'this is a string'
str2 = "and so is this"
str3 = [[ and this is a string too ]]
str4 = "string " .. "concatenation"
val = true and not false -- 布尔和逻辑操作符

if str1 == 'something' then
  print("YES")
elseif str2 ~= 'is not equal' then
  print('Maybe')
else
  print('no')
end

function printText(text)
  print(text)
  return true
end

tab1 = { 'this', 'is, 'a', 'table' } -- 一个数组
tab2 = { also = 'this is a table' } -- 表是数组和词典类型的组合
tab2["new_key"] = "new value"

print(tab2["also"])

require('plugins') -- 这个语句会查找lua文件并且执行他
```

当然这个简短的课程以外还有很多的内容需要学，但是对于我来说从这个简短的课程以及插件文档中复制一些东西就足够编写我的配置文件了

## 配置文件基础教学

好！现在我们看向我们的配置文件。在 Vim 当中我们使用了一系列的方法去配置我们的编辑器（整个 VimL 语言都在致力于这件事，真的）。那么我们现在要学会如何用通用语言 Lua 和 Neovim 的 API 去与 Neovim 的配置项目交互：

- `vim.cmd("set notimeout")` 这是一个安全操作，无论你向`vim.cmd`传输了什么字符串，他们都会被转义成为 VimL。可能你想一次性写几行，那么你需要使用双方括号来做这件事

```lua
vim.cmd([[
set notimeout
set encoding=utf-8
]])
```

- `vim.g.mapleader = ","`等价于`let g:mapleader = ','`；`vim.g`是一个代表全局变量的表
- `vim.o.encoding="utf-8"`等价于`set encoding=utf-8`；其中：
  - `vim.o`用于全局设置
  - `vim.wo`用于窗口设置
  - `vim.bo`用于缓冲设置
- `vim.fn`是一个存放函数的表，你可以使用 `vim.fn.thisIsMyFun` 或 `vim.fn["thisIsMyFun"]` 引用一个函数 `thisIsMyFun`；你可以使用 `vim.fn.thisIsMyFun()` 或 `vim.fn["thisIsMyFun"]()` 调用它
- `vim.api`是一个 API 函数合集。我只用了一个：`vim.api.nvim_set_keymap`。他能映射我的按键组合到一些方法上（继续看，更多内容在下面）

## 是时候搬家到 Lua 编写的配置文件了

移动大部分设置非常简单。你只需将 `set x = y` 替换为 `vim.o.x = "y"`就可以了。然而，其他的时候可能会遇到一些问题：

- 成对的布尔设置被合并为一个设置，例如，你可以用 `vim.o.wrap = true` 和 `vim.o.wrap = false` 来代替 `set wrap` 和 `set nowrap`。
- HOME 目录问题： 我在使用 `~` 作为对某些备份文件等的主目录的引用时遇到问题，所以我通过编写 `HOME = os.getenv("HOME")` 来设置我使用的 HOME 变量
- 字符串连接使用 `..` 运算符，因此为了引用我的备份目录，要写成 `vim.o.backupdir = HOME .. "/.vim/backup"`
- 双反斜杠： 如果你想传递一个特殊字符 `\t` 给 Neovim，你需要在 Lua 中把它写成 `"\\t"`

## 键位映射

Lua API 具有将键映射到某些函数的功能。函数签名是 `vim.api.nvim_set_keymap(mode, keys, mapping, options)`，其中 `mode` 是指代表编辑器模式的字母（`n` 表示正常，`i` 表示插入等），就像在 `nmap` 或 `imap` 等原始 vim 函数中一样， `keys` 是一个表示键组合的字符串，`mapping` 是一个表示键映射到什么的字符串，`options` 是一个表，你可以在其中传递一些附加设置。

举个例子

```lua
vim.api.nvim_set_keymap(
  "n",
  "<leader>a",
  ":Git blame<cr>",
  { noremap = true }
 )
```

这个函数等价于 `nnoremap <leader>a <cmd>Git blame<cr>`

我没有检查可以在第 4 个参数中传递的所有选项是什么，我所用到的两个是 `noremap = true` 和 `Silent = true`。

我还给自己写了一些简单的函数，以避免每次都输入 `vim.api...`：

```lua
function map(mode, shortcut, command)
  vim.api.nvim_set_keymap(mode, shortcut, command, { noremap = true, silent = true })
end

function nmap(shortcut, command)
  map('n', shortcut, command)
end

function imap(shortcut, command)
  map('i', shortcut, command)
end
```

有了这些函数，我上面的例子就变成了 `nmap("<leader>a", "<cmd>Git blame<cr>")`，相比之下，可读性也变得更好了。

## 包管理器

很有可能你已经使用了一些包管理器，当你转向 Lua 时你不需要更改它，你只需将整个插件列表包装在 `vim.cmd` 中并像以前一样继续使用它。

我决定尝试一个名为 [Packer](https://github.com/wbthomason/packer.nvim) 的新包管理器，它是用 Lua 编写的，所以需要 Neovim 0.5 才能使用。安装有点麻烦，因为我不知道 `packpath` 是什么，那个 Packer 需要一些非常具体的目录名称才能找到包。捣鼓了一阵子后，我将它移动到 `~/.config/nvim/pack/packer/start/packer.nvim` 目录并且它运行良好（尽管我确定有更好的安装方法）。

虽然安装有点麻烦，但是 Packer 易于使用，还有我需要的所有功能（还有很多我不需要的功能）。基本配置示例如下所示：

```lua
return require('packer').startup(function()
  use 'wbthomason/packer.nvim'

  -- common
  use 'tpope/vim-fugitive' -- Git commands
  use { 'tpope/vim-rails', ft = "ruby" } -- only load when opening Ruby file
end)
```

如果你需要一些更高级的功能，我建议你查看文档。

## 其他插件

除此之外还有很多很多能适用于 Neovim 0.5 的插件，并且我自己用新的替代品替换了我以前使用过的一些插件。我不会在这里介绍它们（可能在另一篇文章中）但是还是可以简单的看看他们：

- 把`nvim-lspconfig` 与 `nvim-lspinstall` 和 `lspsaga.nvim` 搭配起来一起使用，他们能使用 Neovim 中新的内置 LSP 并提供一些有用的功能。它们让我可以轻松安装和使用语言服务器（例如，显示功能文档或跳转到定义）。再加上 `nvim-compe`（自动补全插件），我用它们来代替原来的 `Ale` 和 `coc.vim`，
- `telescope.nvim` 替换你使用的任何搜索插件（`ctrl-p`, `fzf.vim` 等）。
- `gitsigns` 替换 `vim-gitgutter`

## 总结

把 350 行 `init.vim` 移到 `init.lua` 的整个过程花了我大约 2 小时，包括整理文件的时间（Lua 允许你使用多个配置文件，见我下面的例子），不包括玩新插件的时间。我花了大约 1 个小时来移动 90-95%的内容，另外花了 1 个小时来解决一些问题，如主目录或一些坏掉的的配置。最后我发现整个过程相当快，而且绝对收益良多，虽然我确信很多事情可以做得更好。如果你打算使用 Neovim 0.5 的新功能，我肯定会建议将你的配置转移到 Lua。

**我在 VimL 和 Lua 中的配置：<https://github.com/arnvald/viml-to-lua>**
