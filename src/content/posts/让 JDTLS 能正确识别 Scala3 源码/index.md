---
title: 让 JDTLS 能正确识别 Scala3 源码
date: 2026-09-19 13:15:37
tags:
    - 笔记
    - Java
    - Gradle
    - Minecraft
    - Scala
---

`CasualtiesBelow` 是我突发奇想用 Scala 3 写的 Fabric mod（~~其实是我太想在 Minecraft 里玩 Casualties: Unknown 了~~），考虑到面向 Java 的生态兼容性于是在 `src/test/java/` 里放了一个 Java 写的 API 互操作测试，引用了 Scala 侧的类型。

<!-- more -->

这个时候困扰了我有两三年的问题在不经意间把我直接创死了：默认的 Gradle 配置下 JDTLS 找不到 Scala 的符号，但实际上又能编译出正常的东西。

## 为什么编译没事？

`./gradlew build` 的时候 Scala 插件和 Java 做联合编译，这个时候源码互相可见，那肯定是没有问题的。我使用的是 JDTLS，那么我觉得肯定是 JDTLS 的什么配置出了问题。

注意到 JDTLS 会默认生成多个文件，根据 JDTLS 的文档我们可以得到这两个文件的作用：

- .project 是 workspace 层的（由 Eclipse Platform 的 Resources 插件定义），声明"这里有一个叫什么名字的工程、装了哪些 nature、跑哪些 builder"
- .classpath 是 JDT 层的（由 org.eclipse.jdt.core 定义），声明"这个 Java工程的构建路径是什么"

> [!NOTE]
>
> 既然是继承自 Eclipse 的遗产，那就不奇怪了

### 修法

好了，现在有了几个基本的信息：

- 我们用的是 JDTLS，这是源自 Eclipse Foundation 的作品
- Gradle 能执行源码合并等
  - 参照 Kotlin 编写的 Java mod，这是个很常见的需求

那么问题大致就在于如何让 JDTLS 认得出来需要去找 Scala 的编译结果。

### Eclipse 插件

在 AI 大人的帮助下我找到了这篇 Gradle Eclipse 插件的文档：[The Eclipse Plugins](https://docs.gradle.org/current/userguide/eclipse_plugin.html)

不过仔细探索之下发现这篇文章里的 `Scala` 一节意思是激活 Eclipse IDE 里的 Scala 插件，和我们一点关系都没有......好吧，那很遗憾了。

在仔细阅读后发现了大概是我想要的东西：如果 JDTLS 需要依赖 .classpath 文件的信息，那么或许找对应的配置就能把我们的 Scala 生成的 .class 塞进去

果不其然还真有这种东西：[`eclipse.classpath`, Allows configuring classpath information.](https://docs.gradle.org/current/dsl/org.gradle.plugins.ide.eclipse.model.EclipseClasspath.html)

### 合并 `classpath`

在互联网上搜索的时候发现了两条很有用的论坛帖子，并且均来自 Gradle 自己的论坛，我觉得可行性非常高于是打算试试。

- [How does Buildship create the .classpath file for Eclipse?](https://discuss.gradle.org/t/how-does-buildship-create-the-classpath-file-for-eclipse/26252)
- [Adding a library to .classpath file in Eclipse](https://discuss.gradle.org/t/adding-a-library-to-classpath-file-in-eclipse/33649)

这个时候我得到了两条非常重要的 Gradle 切片

```groovy
eclipse {
	classpath {
		defaultOutputDir = file('war/WEB-INF/classes')
		file {
			whenMerged {
					def gwtClasspath = entries.find { it.path == 'com.gwtplugins.gwt.eclipse.core.GWT_CONTAINER' }
					entries.remove gwtClasspath
					entries += gwtClasspath
			}
		}
	}
}
```

```groovy
eclipse {
    classpath {
        file {
            whenMerged {
                entries += new Library(fileReference(file('/conductor- grpc/build/classes/java/main')))
            }
        }
    }
}
```

他们都有个非常重要的行为：使用了 `whenMerge`，**而这个配置块的意思恰好是当合并的时候添加什么内容**！

## 最后的修改

不过这两条写法是 Groovy 写法，显而易见的我能看懂但*我 写 不 懂*。

那么我们现在的逻辑有了：把 Scala 的编译结果塞到 `classpath` 里就行了。有请 Kimi 大人来帮我写剩下的吧

```kotlin
eclipse {
    classpath {
        val factory = fileReferenceFactory
        // whenMerged 签名是无类型的 Action<?>：预声明成 Action<Classpath> 才能拿到类型化的接收者
        val addScalaClasses = Action<Classpath> {
            entries.add(
                Library(factory.fromPath("build/classes/scala/main")).apply {
                    sourcePath = factory.fromPath("src/main/scala")
                },
            )
        }
        file {
            whenMerged(addScalaClasses)
        }
    }
}
```

完毕，我和 Kimi 大人简直是太厉害了。

## 最后的小坑

小坑还是有的，每次修改完毕 Scala 后都需要手动触发一次编译他才会把编译结果放到 `build/classes/scala/main` 里，这样才能被 JDTLS 识别到。
