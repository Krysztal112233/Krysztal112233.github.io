---
title: 在树莓派上编译 OpenCV
date: 2021-08-02 18:01:39
tags:
  - 技术
  - 捣鼓
---

最近由于比赛需要在树莓派上使用 OpenCV，需要编译 OpenCV。所以写了这篇文章方便记忆。

<!--more-->

## 环境

- RaspberryPi 4 Model B (8GB RAM)
- Raspbian GNU/Linux 10 (buster) armv7l

考虑到树莓派 4B 性能与上一代相比较更加出色，并且我又懒得在笔记本上进行交叉编译，所以需要选用更加快速的编译方案

OpenCV 官方支持 clang 编译器与 ninja 编译系统。

clang 编译器有着不俗的编译速度，ninja 构建系统编译较为智能快速。

综合思考我决定使用 ninja 作为编译系统，使用 clang 作为编译器

## 步骤

### 安装编译依赖

在 OpenCV 的官方文档中写着使用如下命令安装依赖.

另外由于我们使用 clang 编译器与 ninja 构建系统所以我们需要安装 clang，llvm 以及 ninja

```bash
sudo aptitude update && sudo apt install -y cmake wget unzip clang llvm ninja-build
```

得益于 debian 系系统的强大包管理系统，我们可以直接使用 apt 进行编译依赖安装

```bash
sudo aptitude build-dep libcv-dev
```

### 克隆源码

我们需要克隆两个仓库的源码：core modules 仓库以及 opencv_contrib 仓库。

```bash
git clone https://github.com/opencv/opencv.git
git clone https://github.com/opencv/opencv_contrib.git
```

同时记得检出仓库。

```bash
git -C opencv checkout master
git -C opencv_contrib checkout master
```

另外如果想安装定向版本的话则可以选择检出 tags

```bash
git -C opencv checkout <tag>
git -C opencv_contrib checkout <tag>
```

当然我们这里检出 master 分支就行

新建 build 文件夹

```bash
mkdir -p build && cd build
```

### 初始化 ninja 构建系统

随后让 cmake 生成 ninja 所使用的文件,让他用 clang 进行编译。

我们这里不让他编译 example，这样编译速度会快不少。

```bash
cmake -GNinja \
  -D CMAKE_C_COMPILER=clang-9 \
  -D CMAKE_CXX_COMPILER=clang++-9 \
  -D ENABLE_NEON=ON \
  -D ENABLE_VFPV3=ON \
  -D OPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules ../opencv
```

但是注意了，其实这里的 neon 指令集是启动失败的

也就是说性能不会太好，目前暂时没有解决方案。

### 构建与安装

使用如下命令

```bash
ninja && sudo ninja install
```

对，就是如此简单，ninja 自动设置线程数等。成功构建之后自动安装。

大功告成。

### 同步上游更改

得益于 ninja 的特性，我们可以很方便的同步更改并且增量更新

```bash
cd opencv/
git fetch && git pull && cd ../       # 同步上游更改
cd opencv_contrib/
git fetch && git pull && cd ../build  # 同步上游更改并且回到 build 文件夹
ninja                                 # 如果需要重新 cmake 的话 ninja 会自动执行，随后执行增量编译
sudo ninja install
```
