---
title: 用 curl 下载 OnePlus 的 ROM
date: 2026-01-13 01:52:29
tags:
    - 实用
---

刷机，轻而易举啊！

坏了，坏了坏了坏了

<!-- more -->

> [!NOTE]
> 这是一篇很可能过期了的文章，但截止 2025.09.10 可以使用

发现没办法通过浏览器直接下载 OnePlus 的 OTA ROM，于是在 XDA 上翻资源找到了这个邪门的方法

- https://xdaforums.com/t/download-oxygenos-rollback-package.4712819/
  格式大概是 `curl -C - -LO --resolve oxygenos.oneplus.net:443:23.48.224.239 <url>`

以下是举例

- NA `curl -C - -LO --resolve oxygenos.oneplus.net:443:23.48.224.239 https://oxygenos.oneplus.net/4188_sign_CPH2417_11_A_OTA_0090_all_5f7153_10100001.zip`
- GLO `curl -C - -LO --resolve oxygenos.oneplus.net:443:23.48.224.239 https://oxygenos.oneplus.net/4248_sign_CPH2415_11_A_OTA_0080_all_44864f_10100111.zip`
- EU `curl -C - -LO --resolve oxygenos.oneplus.net:443:23.48.224.239 https://oxygenos.oneplus.net/4189_sign_CPH2415_11_A_OTA_0080_all_44864f_01000100.zip`
- IN `curl -C - -LO --resolve oxygenos.oneplus.net:443:23.48.224.239 https://oxygenos.oneplus.net/4190_sign_CPH2413_11_A_OTA_0080_all_e63867_00011011.zip`
