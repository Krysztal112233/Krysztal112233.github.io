---
title: 哟，好久不见，无线打印
date: 2026-07-18 23:28:14
tags:
    - 笔记
    - Linux
    - 教程
    - 嵌入式
---

在一个搬迁的办公室里免费淘来了一台联想 M7605D，可惜只有 USB 口。每次打印都得把线插到电脑上，慢觉得这样搞好麻烦。

<!-- more -->

突然想起我好像还有个吃灰的 Orange Pi Zero 3，决定把这个东西做成一个无线打印盒子。折腾了一下午，居然成了，记录一下。

## 上手

板子刷的是 Armbian 26.8（Debian Trixie，内核 6.18）。这玩意儿只有 miniHDMI 我没线所以没接显示器，突发奇想这个应该是默认启动串口终端的，直接用 USB 转 TTL 连。发现还真是，`/dev/ttyACM0`，115200 波特率。

系统稍好后重启即可。

## 装 CUPS 和驱动

把软件包装上：

```bash
sudo apt install cups avahi-daemon avahi-utils printer-driver-brlaser
```

M7605D 是联想贴牌的机器，本质上是个 Brother 方案的激光打印机，开源社区有个 `brlaser` 项目专门支持这种机器。装上 `printer-driver-brlaser`，里面有现成的 PPD，直接用 `br2260d` 就可以了。

CUPS 的配置改了两处：

- `cupsd.conf` 里把 `Listen localhost:631` 改成 `Port 631`，不然局域网里别的机器根本访问不到。
- `<Location />` 和 `<Location /admin>` 里加上 `Allow @LOCAL`，允许局域网访问管理界面。

## 去掉 usblp 模块（吗？）

互联网上很多做无线打印盒子的教程强调要取掉 `usblp` 模块，但在我一番调查之后我认为并非如此。

[Arch Wiki 的 CUPS/Troubleshooting](https://wiki.archlinux.org/title/CUPS/Troubleshooting#Conflict_with_usblp) 解释了背景：

> USB printers can be accessed using two methods: The usblp kernel module and libusb.

然后明确指出：

> **Warning** As of cups version 1.6.0, it should no longer be necessary to blacklist the `usblp` kernel module.

也就是说从 CUPS 1.6 起（现在还在维护的 Debian 版本早就远超这个版本了），`usblp` 和 `CUPS` 已经可以共存。去掉 `usblp` 只是打印机不工作时的一个排障选项。

> If you have problems getting your USB printer to work, you can try blacklisting the `usblp` kernel module.

所以屏蔽掉这个模块大概率是多余的操作。不过屏蔽掉了也没什么问题，就先维持现状，哪天打印出怪问题了再回头怀疑它。

加打印机的命令：

```text
lpadmin -p M7605D -E -v "usb://Lenovo/M7605D?serial=00000WP01074628" -m drv:///brlaser.drv/br2260d.ppd
lpadmin -d M7605D   # 设为默认
```

## The End

发了几个测试页过去，`lpstat` 里看着任务从 processing 变成 completed，然后打印机咔咔咔开始出纸了。OK，结束。

---

## 续集：mDNS 广播 IPv6 有问题？

本以为完事了，但遇到了几个症状：

- 本机 KDE 的打印设置里能自动发现打印机，但打印没反应。查了下，KDE 走的是本机 `cups-browsed` 自动建的 `implicitclass://` 队列，状态里报 "No suitable destination host found by cups-browsed"。
- iPad 上 AirPrint 时好时坏，偶尔能搜到，偶尔搜不到。

两个症状看着不相干，当时的怀疑对象是 IPv6：本机 `avahi-browse` 的记录里只有一条 `2409:` 开头的公网 IPv6，没有 IPv4。

第一反应是在 Pi 上改 `/etc/avahi/avahi-daemon.conf`，把 IPv6 关了（`use-ipv6=no`）只走 IPv4。改完重启 avahi-daemon。

这里还有个套娃坑：重启完 avahi 之后，本机能发现打印机，但 `avahi-browse -rt` 解析超时。怪的是 `avahi-resolve -n orangepi-printer.local` 明明能解析出 IP。后来想明白了：CUPS 是 avahi 的客户端，它注册到 avahi 里的还是旧信息，avahi 重启后注册就过期了。光重启 avahi 不够，还得 `systemctl restart cups` 让它重新注册。果然，CUPS 一重启，解析立刻正常。

大概率问题其实不是 IPv6，而是 CUPS 的注册状态。既然 IPv6 是被冤枉的，最后又把它开了回来：

```text
use-ipv6=yes
```

现在 avahi 是 IPv4、IPv6 双栈广播，工作一切正常。

## 续续集：客户端的 cups-browsed 也太不靠谱了

改完 avahi 之后我以为 KDE 打印就好了，毕竟"能正常识别"了。结果翻了一下本机的打印队列，发现晚上八点半从 KDE 发的一个任务还卡在队列里，压根没发到 Pi 上去。

卡任务的队列就是 `cups-browsed` 自动建的那个 `implicitclass://` 临时队列，状态还是那句 "No suitable destination host found"。也就是说 Pi 端的 avahi 修好了，但本机 `cups-browsed` 建的队列还是残的，它压根没恢复过来。

这次不跟它纠缠了，直接绕过自动发现，建一个固定队列直连 Pi：

```text
/usr/sbin/lpadmin -p M7605D -E -v "ipp://192.168.2.199:631/printers/M7605D" -m everywhere
lpoptions -d M7605D   # 设为默认
```

`-m everywhere` 是 IPP Everywhere 免驱动模式，CUPS 会直接问对面打印机支持什么格式，不用装任何驱动。测试页一次通过。

两个小发现：一是本机用户在 `lpadmin` 组里，建队列不用 sudo（但 `lpadmin` 在 /usr/sbin 下，不在 PATH 里，得写全路径）；二是把 `cups-browsed` 建的坏队列删掉之后，不到 20 秒它又原样建回来了。那行吧，直接把它整个停掉：

```text
sudo systemctl disable --now cups-browsed
```

反正家里只有这一台网络打印机，那就干脆固定队列吧，`cups-browsed` 可以退休了。

## 局域网打印机的发现与添加

**第一步：发现。** 看看局域网上谁在广播打印机：

```bash
avahi-browse -rt _ipp._tcp
```

输出里关注这几行：

```ini
hostname = [orangepi-printer.local]
address = [192.168.2.199]
port = [631]
txt = [... "rp=printers/M7605D" ...]
```

`address` + `port` 是服务器地址，txt 记录里的 `rp=printers/M7605D` 是打印机在服务器上的队列名。三个信息凑齐就能拼出打印机的 URI：`ipp://192.168.2.199:631/printers/M7605D`。

如果 `avahi-browse` 什么都看不到，问题在服务器端（avahi 没跑或者 CUPS 没注册），别在客户端瞎折腾。

**第二步：添加。** 建一个固定队列指过去：

```bash
/usr/sbin/lpadmin -p M7605D -E -v "ipp://192.168.2.199:631/printers/M7605D" -m everywhere
```

- `-m everywhere`：IPP Everywhere 免驱动，CUPS 自己会问打印机支持什么，不用装任何驱动包。
- 普通用户在 `lpadmin` 组里就能执行，不用 sudo；注意 `lpadmin` 在 /usr/sbin 下，不在 PATH 里，要写全路径。

**第三步：设为默认并验证。** 两条命令搞定：

```bash
lpoptions -d M7605D      # 设为默认
lpstat -v                # 确认队列存在
lp /etc/hostname         # 随便发个小文件测试
lpstat -W completed -o   # 看到任务就是通了
```

iPhone、iPad、Mac 不用做任何事，AirPrint 走 mDNS 自动发现，同一个 WiFi 下直接能搜到。Windows 的话在"添加打印机"里选手动添加，填上面那个 ipp URI 即可。
