---
title: GPG物理密钥的安装与密钥的迁移
date: 2022-06-22 11:20:05
tags:
  - 技术
  - 捣鼓
---

自从买到了心心念念的偶尔才有货的 CanoKey 后就想着怎么发挥我能用到的它的所有功能，配置好一些网站的 `2FA` 后就咸鱼了。

然后我发现他可以保存 OpenPGP 密钥，作为 GPG 的物理密钥。

<!-- more -->

## 前置要求

- 需要一个 OpenPGP 支持的 Smartcard，比如 CanoKey，Yubikey。由于 Yubikey 价格过高，我选择的是开源平替 [CanoKey](https://canokeys.org/)
- 提前安装好 Gpg4Win 之类的 OpenPGP 工具。当然你也可以使用 Git 内自带的 GPG
- 能识别你的硬件的电脑或者硬件（

## 思路

我们需要做以下事情：

- 初始化硬件
- 生成子密钥
- 备份主密钥

### 初始化 Smartcard（后文称之为物理密钥）

经过如下步骤处理可以获得初始化完毕的物理密钥，当然敏感信息也会脱敏。

#### 获取是否能正确识别到物理密钥

```bash
$ gpg --card-edit

Reader ...........: canokeys.org OpenPGP PIV OATH 0
Application ID ...: ******
Application type .: OpenPGP
Version ..........: 3.4
Manufacturer .....: unknown
Serial number ....: ******
Name of cardholder: [not set]
Language prefs ...: [not set]
Salutation .......:
URL of public key : [not set]
Login data .......: [not set]
Signature PIN ....: forced
Key attributes ...: rsa2048 rsa2048 rsa2048
Max. PIN lengths .: 64 64 64
PIN retry counter : 3 3 3
Signature counter : 0
Signature key ....: [none]
Encryption key....: [none]
Authentication key: [none]
General key info..: [none]

gpg/card>

```

如果你的输出和我的差别不大，那么意味着你的物理密钥已经被系统识别到了。

#### 初始化你的物理密钥

这一步推荐阅读 [Debian Wiki - Smartcards OpenPGP#Initialise the smartcard](https://wiki.debian.org/Smartcards/OpenPGP)

简而言之，你需要设置你的物理密钥的

- 用户名
- 语言
- Reset Code
- Admin PIN
- PIN

### 生成主密钥

由此可知，你需要先生成主密钥。这一步推荐根据 [Debian Wiki - Creating a new GPG key](https://keyring.debian.org/creating-key.html) 做。

当你完成了生成主密钥，那么你接下来需要生成子密钥，而主密钥必须要离开你的设备进行保存。

### 生成子密钥

你需要生成三个子密钥，分别是认证(C)，签名(S)，加密(E)。

输入以下命令开始创建三个子密钥

```bash
$ gpg --edit-key --expert [Your Key ID]

******

gpg> addkey
Key is protected.
...
> 选 RSA (sign only)。

******

gpg> addkey

> 选RSA (encrypt only).

******

gpg> addkey

> 选RSA (set your own capabilities)
> 选中 S 和 E 去选掉他们，然后选中 A

******

gpg> save
```

子密钥生成后，我们需要做两件很重要的事情——生成吊销证书，搬家密钥到安全的地方。

### 生成吊销证书

当你的主密钥泄漏的时候，你需要吊销你的主密钥，这个时候吊销证书就会派上用场了。

```bash
gpg --output revoke.asc --gen-revoke <Your Key ID>
```

这个**证书需要妥善保管**，不然任何摸到他的人都能让你的密钥失效。

### 备份你的所有密钥

你的密钥应当全部拥有备份，备份或许可以打印出来，或许可以放到离线储存介质上。

总之备份应当足够的安全离线，要是你想可以让安保机构帮你保管。

```bash
gpg --armor --output privkey.sec --export-secret-key <Your Key ID>
gpg --armor --output subkeys.sec --export-secret-subkeys <Your Key ID>
gpg --armor --output pubkey.asc --export <Your Key ID>
```

导出的私钥与公钥应当妥善保管，你的保存介质**应当得到妥善保管**，包括你的吊销证书。

也就是说你需要备份以下四个东西。保护好他们

- revoke.asc
- privkey.sec
- subkeys.sec
- pubkey.asc （可以选择不备份他，因为他是公钥）

### 让主密钥离线

在完成以上内容后，你应当命令你的主密钥离线。如果你有另外一个物理密钥的话（下文称之为第二物理密钥），你可以选择把你的主密钥传到第二物理密钥，然后把他妥善的保存好。如果你没有第二物理密钥的话，那么也无所谓，把上面导出的内容放到离线介质也是好的。

再次重复强调，这张第二物理密钥和保存密钥的介质应当长期离线，就算需要使用也应该在纯洁环境中使用。

#### 用第二物理密钥

简单说就是把当前的主密钥传输到一张智能硬件上。

```bash
gpg --expert --edit-key <Your Key ID>

gpg> toggle
gpg> keytocard
gpg> save
```

然后这张物理密钥就变成了保存你的主密钥的物理密钥，这张第二物理密钥应当平常不被使用，只有你需要再次签发新子密钥、更换密钥、注销子密钥的时候才使用。

#### 本地离线主密钥

只要我删掉主密钥不就行了吗？只要我导入只有子密钥的密钥不就行了吗？

```bash
gpg --delete-secret-keys [Your Key ID]
```

然后再次输入`gpg -K`，如果他没什么输出那就对了。

我们再导入上文导出的`subkeys.sec`就行了。

让我们再次输入`gpg -K`，如果你看到一个`sec#`那就证明做的很正确，主密钥成功离线。

### 把子密钥搬家到物理硬件

输入以下命令进入编辑密钥模式

```bash
gpg --expert --edit-key <Your Key ID>
```

然后把前面三个子密钥都搬家到物理密钥上

```bash
gpg> key [Sub Key ID]
gpg> keytocard
> 重复选中全部三个，并且都 keytocard
gpg> save
```

在完成以上步骤后，是否我们就结束了？

并不是，我们还需要导出一个`stub.asc`。这个文件并没有实质内容，他告诉 GPG 需要从物理密钥里面寻找所需要的密钥。

```bash
gpg --armor --output stubs.asc --export-secret-keys <Your Key ID>
```

这个密钥可以随着你的常用介质走，导入到你需要的电脑上，他是安全的，因为不包含任何实际上的私钥。

同样的，推荐你把`pubkey.asc`和`stub.asc`放在一起。关于为什么下文会提到

### 上传公钥

你可以选择不做这步，因为上传公钥就能让全世界都能鉴定这是你。如果你是自己用的话就无所谓。

考虑到大多数情况下需要公开公钥，毕竟叫做 PubKey，所以推荐你做这一步。

现在的 KeyServer 会互相同步 Key，因此只需要简单的使用如下命令便可做到全世界的 KeyServer 都有你的 PubKey。

```bash
gpg --send-key [Your Key ID]
```

目前的 GPG KeyServer 默认为 `keyserver.ubuntu.com` ，是国内可以访问的，请放心食用捏。

上文提到的`pubkey.asc`为什么要和你的`stub.asc`放一起？因为一旦到了新设备，很可能新设备没联网，GPG 无法校验是否正确。

两个一起导入后 GPG 就能相信这是你了。

如果能联网哪？如果能联网，能与 KeyServer 通讯，并且已经上传了公钥，那么只需要做下面这一步

```bash
gpg --receive-key [Your Key ID]
```

大功告成 uwu

## 参考文献

- [Debian Wiki - Creating a new GPG key](https://keyring.debian.org/creating-key.html)
- [Debian Wiki - Smartcards OpenPGP](https://wiki.debian.org/Smartcards/OpenPGP)
