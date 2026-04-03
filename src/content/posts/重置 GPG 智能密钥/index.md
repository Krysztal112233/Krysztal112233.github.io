---
title: 重置 GPG 智能密钥
date: 2026-04-03 17:14:32
tags:
    - GPG
---

OpenPGP 的智能卡被锁住了怎么办？

<!-- more -->

那咋办，重置呗。但是不知道为什么又没办法从 CanoKey 的 Console 重置，只有利用 GPG 本身的重置能力来重置。

> [!NOTE]
> 有两个大的前提：
>
> - 我确定吊销我的 OpenPGP 后所有签名会成为幽灵签名，因为我的主密钥已经失去备份了
> - 另外一个是我用的 CanoKey，Yubikey 的论坛上没有看到有人遇到过这个问题

> [!NOTE]
> 这个小故事又告诉我们，有钱就去用 Yubikey 吧，不要贪小便宜。

我于互联网的神秘角落寻得如此禁咒，现传于你，~日后出事了不要把师傅说出去即可。~

```bash
❯ echo "/hex
scd serialno
scd apdu 00 20 00 81 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 81 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 81 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 81 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 83 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 83 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 83 08 40 40 40 40 40 40 40 40
scd apdu 00 20 00 83 08 40 40 40 40 40 40 40 40
scd apdu 00 e6 00 00
scd apdu 00 44 00 00
/echo Card has been successfully reset." > reset
❯ gpg-connect-agent -r reset
```
