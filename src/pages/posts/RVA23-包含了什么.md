---
title: RVA23 包含了什么
date: 2025-07-11 22:57:08
tags:
  - 笔记
  - 技术
  - 编译器
  - 体系架构
---

[Ubuntu 计划在 25.10](https://bugs.launchpad.net/ubuntu/+source/ubuntu-release-upgrader/+bug/2111715) 的 RISC-V 架构中只支持 RVA23 配置文件，于是打算大概看下 RVA23 有什么是比较重大的指令集成为了必选

<!-- more -->

> For Ubuntu 25.10 release we plan to raise the required RISC-V ISA profile family to RVA23.
>
> The ubuntu-release-upgrader should stop upgrades beyond Ubuntu 24.04 on hardware that does not support the RVA23U64 profile. RVA23U64 [1] is the profile relevant for user space.
>
> As there is no upgrade path from Ubuntu 25.04 Plucky for RVA20 systems, we should also stop upgrading these RISC-V systems from Noble to Plucky. Probably a warning is adequate here.

RVA23 配置文件旨在规范 RISC-V 64 位应用处理器的实现，使二进制软件生态系统能够依赖大量有保障的扩展功能和少量可发现的粗粒度选项。RVA23 明确不以支持最小功能集和大量细粒度扩展来实现更大的硬件实现灵活性为目标。

## 指令集

该系列仅规定了用户模式(RVA23U64)和管理模式(RVA23S64)两种配置方案。

### 用户模式强制性基础

| 拓展  | 解释                                                      | 备注                                                                                                                            |
| :---: | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| RV64I | The mandatory base ISA for RVA23U64 and is little-endian. | As per the unprivileged architecture specification, the ECALL instruction causes a requested trap to the execution environment. |

### 用户模式强制性拓展

|    拓展     | 解释                                                                                                                                   | 备注 |
| :---------: | :------------------------------------------------------------------------------------------------------------------------------------- | :--- |
|      A      | 原子指令                                                                                                                               |      |
|      B      | 位操作指令                                                                                                                             |      |
|      C      | 压缩指令                                                                                                                               |      |
|      D      | 双精度浮点指令                                                                                                                         |      |
|      F      | 单精度浮点指令                                                                                                                         |      |
|      M      | 整数乘除法指令                                                                                                                         |      |
|     Zkt     | 数据无关执行延迟控制                                                                                                                   |      |
|    Zicsr    | CSR 控制状态寄存器指令（F 扩展隐含此功能）                                                                                             |      |
|    Zihpm    | 硬件性能计数器                                                                                                                         |      |
|   Za64rs    | 保留集必须为 64 字节连续自然对齐空间                                                                                                   |      |
|   Zfhmin    | 半精度浮点运算                                                                                                                         |      |
|   Zic64b    | 缓存块必须为 64 字节大小且在地址空间中自然对齐                                                                                         |      |
|   Zicbom    | 缓存块管理指令                                                                                                                         |      |
|   Zicbop    | 缓存块预取指令                                                                                                                         |      |
|   Zicboz    | 缓存块清零指令                                                                                                                         |      |
|   Ziccif    | 具有可缓存性和一致性的主存区域必须支持指令获取，且对自然对齐的 2 的幂大小（最大 min(ILEN,XLEN)，RVA23 为 32 位）的指令获取必须是原子的 |      |
|   Zicclsm   | 必须支持对具有可缓存性和一致性的主存区域进行非对齐加载/存储操作                                                                        |      |
|   Ziccrse   | 具有可缓存性和一致性的主存区域必须支持 RsrvEventual 特性                                                                               |      |
|   Zicntr    | 基础计数器和定时器                                                                                                                     |      |
|  Ziccamoa   | 具有可缓存性和一致性的主存区域必须支持 A 扩展中的所有原子操作                                                                          |      |
| Zihintpause | 暂停提示指令                                                                                                                           |      |

RVA23U64 新增了以下强制性扩展：

|   拓展    | 解释                                                       | 备注                           |
| :-------: | :--------------------------------------------------------- | :----------------------------- |
|     V     | 向量扩展                                                   | 注：V 在 RVA22U64 中是可选扩展 |
|    Zcb    | 额外压缩指令集                                             |                                |
|    Zfa    | 额外浮点指令集                                             |                                |
|   Supm    | 指针掩码功能，执行环境至少需支持 PMLEN=0 和 PMLEN=7 的设置 |                                |
|   Zawrs   | 等待保留集指令                                             |                                |
|   Zcmop   | 压缩型可能操作指令                                         |                                |
|   Zimop   | 可能操作指令                                               |                                |
|   Zvbb    | 向量基础位操作指令                                         |                                |
|   Zvkt    | 向量数据无关执行延迟控制                                   |                                |
|  Zicond   | 整数条件操作指令                                           |                                |
|  Zvfhmin  | 向量最小半精度浮点运算                                     |                                |
| Zihintntl | 非临时局部性提示指令                                       |                                |

### 用户模式可选拓展

|   拓展   | 解释                                                          | 备注                                                                                       |
| :------: | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
|   Zbc    | 标量无进位乘法                                                |                                                                                            |
|   Zfh    | 标量半精度浮点运算                                            | 包含在 RVA22U64 标准中                                                                     |
|   Zvbc   | 向量无进位乘法                                                |                                                                                            |
|   Zvfh   | 向量半精度浮点运算                                            |                                                                                            |
|  Zabha   | 字节与半字原子内存操作                                        |                                                                                            |
|  Zacas   | 比较并交换指令                                                |                                                                                            |
|  Zvkng   | 带 GCM 的向量密码学 NIST 算法                                 | 标量密码扩展 Zkn/Zks 已移除；向量密码变为强制要求且性能显著提升；仅包含 GCM 版本以优化性能 |
|  Zvksg   | 带 GCM 的向量密码学商密算法                                   | 同 Zvkng                                                                                   |
| Zama16b  | 未跨越 16 字节边界的非对齐加载/存储/原子内存操作保持原子性    | 实现非对齐原子粒度(Sm1p13)；将加入特权架构的 PMA 章节                                      |
| Zfbfmin  | 标量 BF16 格式转换                                            |                                                                                            |
| Ziccamoc | 具有可缓存性/一致性 PMA 的主存区域必须支持`AMOCASQ`级别的 PMA | 确保支持 CAS 指令；将加入特权架构的 PMA 章节                                               |
| Zicfilp  | 着陆垫机制                                                    |                                                                                            |
| Zicfiss  | 影子栈                                                        |                                                                                            |
| Zvfbfmin | 向量 BF16 格式转换                                            |                                                                                            |
| Zvfbfwma | 向量 BF16 扩展乘加运算                                        |                                                                                            |

### 管理模式强制性拓展

RVA23S64 除了包含所有 RVA23U64 的所有强制性拓展外还包含了如下的强制性拓展

|     拓展     | 解释                                                                                                                                                                                                 | 备注                                                                                                                                                          |
| :----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    Ss1p13    | 监管者架构版本 1.13                                                                                                                                                                                  | Ss1p13 取代了 Ss1p12。                                                                                                                                        |
|   Ssccptr    | 具有可缓存性和一致性 PMA 的主存区域必须支持硬件页表读取                                                                                                                                              |                                                                                                                                                               |
|   Sscofpmf   | 计数器溢出和基于模式的过滤                                                                                                                                                                           |                                                                                                                                                               |
| Sscounterenw | 对于任何非只读零的`hpmcounter`，`scounteren`中的相应位必须可写                                                                                                                                       |                                                                                                                                                               |
|    Ssnpm     | 指针掩码，`senvcfg.PMM`和`henvcfg.PMM`至少支持 PMLEN=0 和 PMLEN=7 的设置                                                                                                                             |                                                                                                                                                               |
|     Sstc     | 监管者模式定时器中断                                                                                                                                                                                 | Sstc 在 RVA22 中是可选的                                                                                                                                      |
|   Sstvala    | 对于加载、存储和指令页面错误、访问错误及不对齐异常，以及由非`EBREAK`或`C.EBREAK`指令执行引起的断点异常，`stval`必须写入引发错误的虚拟地址。对于虚拟指令和非法指令异常，`stval`必须写入引发错误的指令 |                                                                                                                                                               |
|   Sstvecd    | `stvec.MODE`必须能够保存值 0（直接模式）。当`stvec.MODE=Direct`时，`stvec.BASE`必须能够保存任何有效的四字节对齐地址                                                                                  |                                                                                                                                                               |
|   Ssu64xl    | `sstatus.UXL`必须能够保存值 2（即必须支持 UXLEN=64）                                                                                                                                                 | Ssu64xl 在 RVA22 中是可选的                                                                                                                                   |
|     Sv39     | 基于页的 39 位虚拟内存系统                                                                                                                                                                           |                                                                                                                                                               |
|    Svade     | 当 A 位清零时访问页面或 D 位清零时写入页面会引发页面错误异常                                                                                                                                         |                                                                                                                                                               |
|    Svbare    | 必须支持`satp`模式的 Bare                                                                                                                                                                            |                                                                                                                                                               |
|   Svinval    | 细粒度地址转换缓存无效化                                                                                                                                                                             |                                                                                                                                                               |
|   Svnapot    | NAPOT 转换连续性                                                                                                                                                                                     | Svnapot 在 RVA22 中是可选的                                                                                                                                   |
|    Svpbmt    | 基于页的内存类型                                                                                                                                                                                     |                                                                                                                                                               |
|   Zifencei   | 指令获取屏障                                                                                                                                                                                         | Zifencei 是 RVA23 应用处理器中支持指令缓存一致性的唯一标准方式，因此被强制要求。新的指令缓存一致性机制正在开发中（暂定名为 Zjid），未来可能作为可选功能加入。 |

其中 **Sha** 拓展包含了如下拓展

|     拓展     | 解释                                                                                                                    | 备注                                                        |
| :----------: | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
|      H       | 虚拟机监控程序扩展                                                                                                      |                                                             |
| Shcounterenw | 对于任何非只读零的`hpmcounter`，`hcounteren`中的相应位必须可写                                                          |                                                             |
|   Shgatpa    | 对于`satp`中支持的每个虚拟内存方案 SvNN，必须支持相应的 hgatp SvNNx4 模式。同时必须支持`hgatp`的 Bare 模式              | 增强型虚拟机监控程序扩展(完全等同于 Sha)在 RVA22 中是可选的 |
|   Shtvala    | 在 ISA 允许的所有情况下，`htval`必须写入引发错误的客户机物理地址                                                        |                                                             |
|   Shvsatpa   | `satp`中支持的所有转换模式都必须在`vsatp`中支持                                                                         |                                                             |
|  Shvstvala   | 在上述所有`stval`描述的情况下，都必须写入`vstval`                                                                       |                                                             |
|  Shvstvecd   | `vstvec.MODE`必须能够保存值 0（直接模式）。当`vstvec.MODE`=Direct 时，`vstvec.BASE`必须能够保存任何有效的四字节对齐地址 |                                                             |
|  Ssstateen   | 状态使能扩展的监管者模式视图。必须提供监管者模式(`sstateen0-3`)和虚拟机监控程序模式(`hstateen0-3`)的状态使能寄存器      |                                                             |

### 管理模式可选拓展

|   拓展   | 解释                                                                                           | 备注                                                                                                                                                                                                  |
| :------: | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  Sdtrig  | 调试触发器                                                                                     |                                                                                                                                                                                                       |
|   Sspm   | 监管者模式指针掩码，执行环境至少需支持 PMLEN=0 和 PMLEN=7 的设置                               |                                                                                                                                                                                                       |
| Ssstrict | 不存在非标准扩展。尝试执行未实现的指令或访问标准/保留编码空间中未实现的 CSR 将触发非法指令异常 | Ssstrict 是新的配置文件定义扩展，用于限制保留编码空间的行为。注 1：Ssstrict 不规定自定义编码空间或 CSR 的行为。注 2：Ssstrict 定义适用于声称兼容 RVA23 的执行环境，该环境必须包含虚拟机监控程序扩展。 |
|   Sv48   | 基于页的 48 位虚拟内存系统                                                                     |                                                                                                                                                                                                       |
|   Sv57   | 基于页的 57 位虚拟内存系统                                                                     |                                                                                                                                                                                                       |
|  Svadu   | 硬件自动更新 A/D 位                                                                            |                                                                                                                                                                                                       |
|  Svvptc  | 从无效 PTE 到有效 PTE 的转换将在有限时间内可见，无需显式内存管理屏障                           |                                                                                                                                                                                                       |
|   Zkr    | 熵 CSR                                                                                         |                                                                                                                                                                                                       |

## 观测

- 对于 RVA23 来讲，最显著的是之前 RVA22 的 V 拓展现在是强制性的，我想这也是面向 AI 时代的一个必然。如果一个 CPU 没有向量加速相关的拓展那么这个 CPU 的效率是无法达到现代的标准的。
- 除此之外，Sha 现在也成为了必选，这是在 RISC-V 上运行虚拟机的基础

这也是 RVA23 的主打卖点：

> Vector Extension: The Vector extension accelerates math-intensive workloads, including AI/ML, cryptography, and compression / decompression. Vector extensions yield better performance in mobile and computing applications with RVA23 as the baseline requirement for the Android RISC-V ABI.
>
> Hypervisor Extension: The Hypervisor extension will enable virtualization for enterprise workloads in both on-premises server and cloud computing applications. This will accelerate the development of RISC-V-based enterprise hardware, operating systems, and software workloads. The Hypervisor extension will also provide better security for mobile applications by separating secure and non-secure components.

### 和 `x86_64v4` 的区别

由于我用的是 Zen4 系列的 Ryzen9 7945HX，所以以我的 CPU 为标准

> 包含如下指令集
>
> fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx mmxext fxsr_opt pdpe1gb rdtscp lm constant_tsc rep_good amd_lbr_v2 nopl xtopology nonstop_tsc cpuid extd_apicid aperfmperf rapl pni pclmulqdq monitor ssse3 fma cx16 sse4_1 sse4_2 x2apic movbe popcnt aes xsave avx f16c rdrand lahf_lm cmp_legacy svm extapic cr8_legacy abm sse4a misalignsse 3dnowprefetch osvw ibs skinit wdt tce topoext perfctr_core perfctr_nb bpext perfctr_llc mwaitx cpb cat_l3 cdp_l3 hw_pstate ssbd mba perfmon_v2 ibrs ibpb stibp ibrs_enhanced vmmcall fsgsbase bmi1 avx2 smep bmi2 erms invpcid cqm rdt_a avx512f avx512dq rdseed adx smap avx512ifma clflushopt clwb avx512cd sha_ni avx512bw avx512vl xsaveopt xsavec xgetbv1 xsaves cqm_llc cqm_occup_llc cqm_mbm_total cqm_mbm_local user_shstk avx512_bf16 clzero irperf xsaveerptr rdpru wbnoinvd cppc arat npt lbrv svm_lock nrip_save tsc_scale vmcb_clean flushbyasid decodeassists pausefilter pfthreshold avic vgif x2avic v_spec_ctrl vnmi avx512vbmi umip pku ospke avx512_vbmi2 gfni vaes vpclmulqdq avx512_vnni avx512_bitalg avx512_vpopcntdq rdpid overflow_recov succor smca fsrm flush_l1d amd_lbr_pmc_freeze

- 可以注意到，`x86_64v4` 上甚至有能效控制相关的指令集：`apic`, `cppc`, `rapl`, `monitor`。但是 RVA23 是没有的

以上只是非常主观的观测，指令集的指令还有更细致的区别但是因为太多了（而且我不太懂）就算了

### 不足之处？

指令集只是硬件层面的一部分，在硬件之上的软件支持也十分重要。这一点很依赖编译器和上游软件的实现，很可惜的是截至当前编译器和上游软件对 RVA23 的支持并不明朗，请查看 Yangyu Chen 的[研究](https://www.rv64.zip/)，原因讲的非常详细
