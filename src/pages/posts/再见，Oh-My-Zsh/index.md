---
title: 再见，Oh My Zsh。
date: 2026-01-6 20:11:36
tags:
  - 笔记
  - 实用工具
---

Oh My Zsh 陪伴了我一整个学生时代，自从使用 zsh 后就没有离开过 Oh My Zsh。

不过终有离别的时候，上一次改革自己的工作条件是因为 VSCode 工作速度太慢不跟手导致体验非常不好，现在这把砍刀终于砍到 shell 上了。

<!-- more -->

## 挥别

很高兴的是我的 shell 配置习惯非常好，所有的自己定义的配置文件都集中在了 `.zprofile` 中，因此只需要保留这个文件就好。

## 我需要什么？

在替换掉 Oh My Zsh 之前，我要想下我需要什么东西？

- 需要一个还不错的 prompt？来保证我知道我现在的目录里有什么信息。
  - 比如 git，nodejs 版本等
- 需要补全系统。**_默认的 zsh 是没有启用补全的_**。
- zsh 还可以在输入内容可以被判定为目录的时候自动切换到目录中，这个我也需要。
- 还需要历史记录，这也是默认情况下 zsh 没有的
- 还有...对历史记录的模糊搜索！

现在我们知道需要什么了，开始超级拼装吧！

## 超级拼装

这些方案都有现成的，所以拼起来非常简单。

### 自动补全 & 历史功能 & 自动 cd

zsh 自带补全模块和自动 cd 模块，我们简单设置一下就好

不过我把历史记录大小设置得非常大，建议按照自己的需求修改

```bash
export HISTFILE=~/.zsh_history
export HISTSIZE=1000000000
export SAVEHIST=$HISTSIZE

setopt EXTENDED_HISTORY
setopt autocd
autoload -U compinit; compinit
```

### 历史搜索

我使用 fzf 作为我的模糊搜索器，他非常出名而且几乎是系统源中必然就有[]()的

fzf 已经做了相关支持，我们只需要简单的应用一下就好

```bash
source <(fzf --zsh)
```

### 更多的快捷键配置

在我还在使用 Oh My Zsh 的时候，可以使用 `Ctrl+<Left>` 和 `Ctrl+<Right>` 跳转命令行中的单词。

到后来我才发现这个并不是 zsh 自身的设定，因此需要自己做一个绑定

```bash
bindkey '^[[1;5D' emacs-backward-word
bindkey '^[[1;5C' emacs-forward-word
```

快捷键本质上是 CSI 序列，如果不知道组合键的做法，你可以使用如下命令**然后键入组合键**来获取 CSI 序列

```bash
cat > /dev/null
```

### 原先的环境配置

我自己的环境配置都是在 `.zprofile` 中，因此在 `.zshrc` 中 source 一下就行了

### 更好的提示符

我采用 [starship](https://starship.rs/) 作为我的提示符，同时我希望他可以负担一部分主题的功能，虽然主题确实显得很不重要了 :)

不过`starship` 默认会开启几乎所有的显示功能，有些我是不太需要的，因此我也需要关掉，这些一般是一些云服务。

我使用的是 Oh My Zsh 的默认主题 `robbyrussell`，就只是个简单的加粗绿色箭头符号，因此我打算继承下来。

```toml
"$schema" = 'https://starship.rs/config-schema.json'

add_newline = true

[package]
disabled = true

[aws]
disabled = true
```

然后在我们的 `.zshrc` 中启用我们的 `starship`

### 候选高亮

在以上的配置中我们发现没有候选高亮，在搜索之下我们添加如下的 zsh 配置即可

```bash
zstyle ':completion:*' menu select
```

### 更多？

更多的就不需要我介绍了，可以自己装插件管理器来实现更多的功能。

## 最终答案

在最后，我们得到了一个十分简单易用的 zsh 配置！

```bash
#################################################
#                     zsh                       #
#################################################
export HISTFILE=~/.zsh_history
export HISTSIZE=1000000000
export SAVEHIST=$HISTSIZE

setopt EXTENDED_HISTORY
setopt autocd
autoload -U compinit
compinit

zstyle ':completion:*' menu select

#################################################
#                  keybinds                     #
#################################################
bindkey '^[[1;5D' emacs-backward-word
bindkey '^[[1;5C' emacs-forward-word

#################################################
#                 environment                   #
#################################################
source ~/.zprofile

eval "$(starship init zsh)"

source <(fzf --zsh)
```

晚安，Oh My Zsh。
