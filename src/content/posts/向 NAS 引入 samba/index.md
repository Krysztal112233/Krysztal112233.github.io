---
title: 向 NAS 引入 samba
date: 2026-04-02 20:36:00
tags:
    - 教程
    - Linux
    - 存储
    - DevOps
---

最近感觉自己的 NAS 共享管理非常混沌，于是打算重新规整一下：引入 `samba` 和重新分级一下目录层次

<!-- more -->

## 原始目录结构

我的目录布局如下所示

```bash
root in 🌐 homelab in /pool
❯ tree -L2
.
├── bulk
│   ├── backup
│   ├── ebooks
│   ├── forks
│   ├── mirrors
│   └── scripts
└── striping
    ├── Assets
    ├── Forks
    ├── ISO
    ├── Medias
    ├── Mirrors
    ├── Softwares
    └── Tmp

15 directories, 0 files
```

我的 ZFS 子卷如下所示

```bash
root in 🌐 homelab in ~
❯ zfs list
NAME                         USED  AVAIL  REFER  MOUNTPOINT
bulk                        2.88T  18.9T  2.86T  /pool/bulk
bulk/backup                  128K  18.9T   128K  /pool/bulk/backup
bulk/torrent                 160K  18.9T   160K  /srv/torrent
striping                    1.15T  2.23T  1.04T  /pool/striping
striping/QEMU                 96K  2.23T    96K  /var/lib/libvirt/images
striping/home               13.5G  2.23T  13.5G  /home
striping/opt                72.6G  2.23T  72.6G  /opt
striping/podman             22.7G  2.23T    96K  legacy
striping/podman/containers  22.7G  2.23T  22.7G  /var/lib/containers
```

换句话来讲，实际上 `home` 都已经完全在一个子卷中了，因此如果可以利用这一点应该是更好的选择。

## `samba` 规划

我的计划如下：

- 用户均将其自身的 `home` 目录作为 `samba` 共享目录
- 除此之外 `/pool/striping` 作为公共目录，默认情况下只读不能写
- 只有被添加到 `smbusers` 组的用户可以登录和访问 `samba`，同时具备 `smwriters` 组的用户可以对其读写

在 [samba 的 wiki 中](https://wiki.samba.org/index.php/Setting_up_Samba_as_a_Standalone_Server#Creating_Local_User_Accounts,_option_#1)提到，`samba` 确实有能力使用系统账户来达到这一点，但是 `samba` 使用了自己的用户数据库，所以密码需要单独创建。

## 引入 `samba`

直接使用 Debian 源内的 `samba` 就好了，直接快速安装即可。

### 编写配置

结合一下官方给的最小化配置以及我的个人需求，我的配置如下所示

```INI
[global]
   workgroup = WORKGROUP
   server role = standalone server
   map to guest = never
   disable netbios = yes

[homes]
   comment = Home Directories
   browseable = no
   read only = no
   valid users = %S
   create mask = 0600
   directory mask = 0700

[public]
   path = /pool/
   browseable = yes
   read only = yes
   valid users = @smbusers
   write list = @smbwriters
   create mask = 0664
   directory mask = 0775
```

在实现这一点后，使用 `testparam -s` 测试一下 `samba` 的配置是否正确。

### 设置用户密码

在上文中提到过，`samba` 用户需要单独设置密码。

使用如下命令来设置密码：

```bash
root in 🌐 homelab in ~
❯ smbpasswd -a krysztal
```

### 配置自动发现

> [!NOTE]
> 经过我反复调试后我感觉自动发现 Linux 的自动发现做得很差，最好的方式还是按照诸如通过 `smb://homelab.lan/krysztal` 这样直接连接的方式链接

Debian 中存在两个包来实现自动发现，其中一个是 `wsdd` 另外一个是 `wsdd-server`：

- `wsdd`: Python Web Services Discovery Daemon, Windows Net Browsing
- `wsdd-server`: Python Web Services Discovery Daemon, Windows Net serving

根据描述，安装 `wsdd-server` 即可

## 和系统用户同步密码？

Debian 安装的 `samba` 配置文件中其实有如下配置项：

```INI
# This boolean parameter controls whether Samba attempts to sync the Unix
# password with the SMB password when the encrypted SMB password in the
# passdb is changed.
   unix password sync = yes

# For Unix password sync to work on a Debian GNU/Linux system, the following
# parameters must be set (thanks to Ian Kahan <<kahan@informatik.tu-muenchen.de> for
# sending the correct chat script for the passwd program in Debian Sarge).
   passwd program = /usr/bin/passwd %u
   passwd chat = *Enter\snew\s*\spassword:* %n\n *Retype\snew\s*\spassword:* %n\n *password\supdated\ssuccessfully* .

# This boolean controls whether PAM will be used for password changes
# when requested by an SMB client instead of the program listed in
# 'passwd program'. The default is 'no'.
   pam password change = yes
```

这些配置项实现的是：改 `smb` 密码时顺便修改 UNIX 密码，并不是反过来的。

至于到底怎么做联动，暂时没有想出来，在想出来之前直接用土法命令改好了：

```bas
passwd krysztal
smbpasswd krysztal
```
