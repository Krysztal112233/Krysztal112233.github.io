---
title: 让 OpenCV 可以被静态链接
date: 2025-02-11 17:51:12
tags:
  - 技术
  - 捣鼓
---

在 Alpine 的环境里，需要尽可能让程序被静态链接，否则程序还需要安装巨大的 glibc 和其他动态库，不符合 Alpine 的原则，也不太方便被部署。但 OpenCV 并不是那么容易被静态链接，应该怎么办？

<!-- more -->

<del>OpenCV
没有那么容易被静态链接，主要还是因为它的依赖里有很难被静态链接的库：GTK，Qt，FFMpeg
所以需要重新考虑编译参数。我们有一个很好的参考，GoCV的仓库里有静态链接的Dockerfile，根据Dockerfile我们获取新的编译参数即可:</del>

```bash
cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D WITH_IPP=OFF \
    -D WITH_OPENGL=OFF \
    -D WITH_QT=OFF \
    -D WITH_FREETYPE=ON \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    -D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib-${OPENCV_VERSION}/modules \
    -D OPENCV_ENABLE_NONFREE=ON \
    -D WITH_JASPER=OFF \
    -D WITH_TBB=ON \
    -D BUILD_JPEG=ON \
    -D WITH_SIMD=ON \
    -D ENABLE_LIBJPEG_TURBO_SIMD=ON \
    -D BUILD_DOCS=OFF \
    -D BUILD_EXAMPLES=OFF \
    -D BUILD_TESTS=OFF \
    -D BUILD_PERF_TESTS=ON \
    -D BUILD_opencv_java=NO \
    -D BUILD_opencv_python=NO \
    -D BUILD_opencv_python2=NO \
    -D BUILD_opencv_python3=NO \
    -D OPENCV_GENERATE_PKGCONFIG=ON ..
```

<del>使用这份编译参数就可以获取一份可以被静态链接的 OpenCV 了</del>

放弃了，毁灭吧。这个世界就不存在可以被静态链接的 OpenCV4。
