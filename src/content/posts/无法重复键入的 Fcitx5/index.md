---
title: 无法重复键入的 Fcitx5
date: 2026-03-30 22:10:38
tags:
    - 笔记
    - Linux
---

fcitx5 会在所有除了 Konsole 之外的终端卡死，何意味。

<!-- more -->

具体表现为输入文字长按是不会触发重复输入，请看 VCR：

![实机演示](https://github.com/user-attachments/assets/69b639b8-a37c-4438-80ef-9286c2fdb74d)

而作为一个 Vim 用户，个人非常依赖这个功能——使用 `hjkl` 如果能高速触发的话用起来比 `<C-d>` 更舒服且精准。

这一切到底是为什么呢。。。

## Ghostty?

> [!NOTE]
> Ghostty 不允许直接创建 issues，因此需要在 discussion 中创建

Ghostty 的 Discussion 中已经有不少的议题来研究这个问题，其中最相关的 discussion 是

- [Dead keys stopped working since GNOME 49 / GTK 4.20 #8899](https://github.com/ghostty-org/ghostty/discussions/8899)
- [The Linux Input Meta-Discussion #8910](https://github.com/ghostty-org/ghostty/discussions/8910)

看起来完全不像是 Ghostty 的问题，更像是输入法的问题，因此我把目光转向了输入法上。

## Fcitx5?

在 Fcitx5 的 issues 区域直接搜索 repeat 就找到了最相关的议题：

- [Input method blocks key repetition #1445](https://github.com/fcitx/fcitx5/issues/1445)

根据作者的说法，Fcitx5 生成重复按键序列这件事并不完全可靠，只能说堪堪够用。

但是该 issues 止步于此，在最后一次更新后没有了回应。

于是我补充了一下行为验证和 `fcitx5-diagnose` 信息，并且接着寻找相关 issues：类似的问题并不少，主要来源于 Wayland 的出现打破了原有的输入法模型：

> This is quite silly since whether an key event is filtered by input method or
> not should be fully controlled by input method, and the wayland's input
> method keyboard grab model totally break the point of this..

在维护者 WengXuetian 的[博客](https://www.csslayer.info/wordpress/linux/key-repetition-and-key-event-handling-issue-with-wayland-input-method-protocols/)中亦然披露了这一点：

> Here is where it becomes problematic when Wayland decides to use keyboard grab for input method, and client side key repetition.
>
> In X11, key repetition is done on the X Server side, client doesn’t need to worry about the key repetition generation. Client will just receive multiple key press events (release is optional, depending on a “detectable key repetition” option) until the key is physically released.
>
> In Wayland, the key repetition is done on the application(client) side, the common logic is to implement this feature is that, when client gets a wl_keyboard.key press, it will start a timer and generate new key event on its own.

> 当 Wayland 决定对输入法使用键盘抓取，并在客户端进行按键重复处理时，问题就出现了。
>
> 在 X11 系统中，按键重复功能由 X 服务器端实现，客户端无需处理按键重复的生成逻辑。客户端只需持续接收多次按键按下事件（按键释放事件是可选的，取决于“可检测按键重复”选项的设置），直到物理按键被释放为止。
>
> 而在 Wayland 系统中，按键重复功能需由应用程序（客户端）自行实现。常见的实现逻辑是：当客户端接收到 wl_keyboard.key 按下事件时，会启动计时器并自主生成新的按键事件。

而维护者所给出的解决方案是模拟一套之前在 X Server 所使用的协议模型。倒是暂时解决了这个问题（吗？）

## GTK4 的问题？

很明显这个问题并没有解决，而且也没搞清楚为什么。

在继续翻阅相关 issues 的时候我找到了这个 discussion：

- [can not activate input method when set GTK_IM_MODULE=fcitx #3628](https://github.com/ghostty-org/ghostty/discussions/3628)

于是我突发奇想，要是设置环境变量 `$GTK_IM_MODULE` 为 `fcitx5` 的话会发生什么？

于是我使用了如下命令来启动一个 Ghostty：
GTK_IM_MODULE

```bash
GTK_IM_MODULE=fcitx5 ghostty
```

然后启动的终端居然就没有这个问题了。

### 持久化配置

既然找到临时的解决方法了还是打算做一下持久化配置，总是使用命令行来启动 Ghostty 是十分不舒服的。

搜寻了一下桌面环境自己的环境配置方式，[KDE 的 Wiki](https://userbase.kde.org/Session_Environment_Variables) 里有相关的记载：使用会话环境变量即可：

> To add paths to your PATH, simply create a file named $HOME/.config/plasma-workspace/env/path.sh with a contents similar to this:
>
> ```bash
> export PATH=$HOME/.local/bin:$PATH
> ```

## 尾声

这件事暂时告一段落了，Fcitx 的维护者 WengXuetian 向 KDE 上游提交了 MergeRequest 来尝试解决这个问题：尽可能想办法让 KDE 的输入模型能像是之前的 X Server 模型一样，更方便输入法来处理。

可以追踪：[Split updateKey & notifyKeyboardKey to two different function.](https://invent.kde.org/plasma/kwin/-/merge_requests/8894)
