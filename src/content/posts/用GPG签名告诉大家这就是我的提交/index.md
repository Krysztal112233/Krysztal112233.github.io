---
title: 用GPG签名告诉大家这就是我的提交
date: 2022-02-18 14:14:24
tags:
    - Git
---

同学们早，大家签名 Commit 了吗？不签也可以，随便你。jpg

<!-- more -->

其实并不是我主动发现的这个功能，而是我看到了这些个洋葱新闻才发现了问题：

- [Linus:我发现了那个叫做 WindowsXP 的系统很棒，Linux 是个垃圾系统](https://github.com/torvalds/linux/tree/8bcab0346d4fcf21b97046eb44db8cf37ddd6da0)

好吧，还是搞搞 GPG 签名比较稳妥，虽然我的项目也不会有人这么搞就是了

> [!NOTE]
> 本来这是 GitHub 很早前就有的漏洞了，他们说这个不影响。现在闹大了才勉强对这种情况标了个游离提交

Git 本身使用邮箱标注是谁的提交，这样就意味着可以随意冒充。但是新版本 Git 支持了 GPG 签名，这样就算 SSH Key 泄露了也能保证这个提交是你的了

> [!NOTE]
> Windows 的 git 已经包含了 GPG，不需要额外安装了。但是需要在 GitBash 下才能使用。不过 VSCode 也可以使用就是了

## 验证是否已经有了 GPG 密钥

```bash
gpg --list-secret-keys --keyid-format LONG
```

如果输出有的话，那么就不想要新建了

## 新建 GPG 密钥

```bash
gpg --full-generate-key
```

可以一路回车，输入邮箱之类的推荐用在 GitHub 验证过的

其实按照 GitHub 的工作原理的话，邮箱也必须是在 GitHub **验证**过的

> [!NOTE]
> 密钥长度这一项一定要写 4096 长度，这是 [GitHub 的要求](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key)

## 导出公匙

### 列出所有密钥

```bash
gpg --list-secret-keys --keyid-format=long
```

举个例子，假设它的输出为下面这样

当然，你能通过时间看出来谁是最新的，最新的那个当然是你想要的

```bash
$ gpg --list-secret-keys --keyid-format=long
/Users/hubot/.gnupg/secring.gpg
------------------------------------
sec   4096R/3AA5C34371567BD2 2016-03-10 [expires: 2017-03-10]
uid                          Hubot
ssb   4096R/42B317FD4BA89E7A 2016-03-10
```

### 复制以 sec 开头的 GPG 密钥 ID

根据上面一条的输出，所以它的密钥 ID 为

```bash
3AA5C34371567BD2
```

### 导出该 ID 的公钥

根据上一步，接下来我们的命令会变成这样

```bash
gpg --armor --export pub 3AA5C34371567BD2
```

他会输出你的公钥，把它们全部粘贴复制到 GitHub 的 [GPG Keys](https://github.com/settings/keys) 里面就行

## 将 GPG 密钥与 Git 关联

把上面的 ID 粘贴复制下来，输入下面这个命令

```bash
git config --global user.signingkey 3AA5C34371567BD2
```

然后我们需要让 Git 默认用 GPG 签名

```bash
git config --global commit.gpgsign true
```

大功告成
