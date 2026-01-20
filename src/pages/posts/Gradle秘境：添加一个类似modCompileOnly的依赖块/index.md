---
title: Gradle秘境：添加一个类似modCompileOnly的依赖块
date: 2023-09-17 15:55:58
tags:
  - 笔记
  - 学习
  - 技术
---

FabricLoom 里有类似 `modCompileOnly`、`modApi`、`modImplementation`、`modRuntimeOnly` 配置块，那应该怎么做才能在自己的 Gradle 插件里实现类似的功能？

<!-- more -->

假设：你已经会了 Kotlin，并且大概知道怎么使用 Gradle，并且 Gradle 的插件项目已经成功创建，并且可以成功被加载

## 为什么要这么做？那是什么？

先介绍一下 FabricLoom 这个 Gradle 插件的的 `modCompileOnly` 等配置块的功能。

这个配置块用于在 `dependencies` 块里描述一个新的依赖，但是 Gradle 会依赖你写的是 `implementation` 或者 `compileOnly` 而执行对应的功能。

举个例子，你会在 FabricLoom 项目的 build.gradle 里面看到类似这样的配置块：

```groovy
dependencies {
    minecraft "com.mojang:minecraft:${project.minecraft_version}"
    mappings "net.fabricmc:yarn:${project.yarn_mappings}:v2"
    modImplementation "net.fabricmc:fabric-loader:${project.loader_version}"
}
```

但是你会发现，往往不需要再次声明一次对于 `net.fabricmc:fabric-loader:${project.loader_version}` 这个依赖的 `implementation` 配置块。

这是为什么？因为 `modImplementation` 配置块继承了 `implementation` 配置块，所以在这项依赖被 `implementation` 配置块对应的处理器处理后，可以被 FabricLoom 再次收集信息，加入 Minecraft Client 的模组加载列表里面！

很好，这下应该解释清楚了为什么要做这项工作，那么我们的正事开始——设计新的 `plImplementation` 配置块，并且收集所有配置块的信息。

## 代码实现

接下来的代码用 Kotlin 实现，所以前文需要假设你会 Kotlin（毕竟 Kotlin 不难）

先想清楚我们要做什么：添加一个叫做 `plImplementation` 的依赖块，可以写到 `dependencies` 块里，并且它可以被视为是正常的 `implementation` 块能被当作依赖处理。

### 新增一个 `configuration`

在 Gradle 插件进行注册的时候，我们把这段代码写到插件注册里去

```kotlin
configuration.register("plImplementation") {
    it.extendsFrom(configuration.getByName(JavaPlugin.COMPILE_ONLY_CONFIGURATION_NAME))
    it.description = "Extend from `implementation`, but it will add dependencies into `plugins` directory."
}
```

只要成功运行那就是注册成功，这里通过 `it$extendsFrom` 说明了它是继承了 `implementation` 块。

### `@TaskAction` 里进行操作

在 `@TaskAction` 里我们这样写

```kotlin
project.configurations
    .getByName("plImplementation")
    .incoming
    .resolutionResult
    .allComponents
    .forEach { result ->
        result.dependencies.forEach { dependency ->
            project.logger.info(":$PL_TASK_EVALUATE_PLUGIN: $dependency")
        }
    }
```

这样就可以获取到如下 `plImplementation` 块的依赖了，并且对他进行额外处理

```kotlin
dependencies {
    plImplementation("net.fabricmc:fabric-loader:${project.loader_version}")
}
```
