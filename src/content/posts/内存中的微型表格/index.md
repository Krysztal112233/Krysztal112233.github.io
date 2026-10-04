---
title: 内存中的微型表格
date: 2026-10-04 20:43:15
tags:
    - 笔记
    - Rust
    - 数据结构
    - 算法
---

Table, but you can sort it as your wish.

<!-- more -->

## 背景故事

本 crate 源于一个真实的需求：表格排序。

这个需求最先起于 [uutils/procps](https://github.com/uutils/procps/) 中 `top` 的排序需求。在最初的实现中我只考虑了单列排序，但随着时间的发展，`procps-ng` 突然开始了快速发展：他们引入了进程的树状视图。

在这个时候情况没有变得更糟糕，毕竟只是单独写个算法的事儿，不是很难。直到后来，我意识到了危机：`ps` 命令支持多键排序！

这是什么意思呢？我们使用一个切实的例子来进行展示，避免不好理解。

### 使用 `ps` 命令得到的例子

笔者的测试环境为 Debian Testing，为 2026-10-02 的滚动版本。

```bash fold
❯ ps -eo uid,user,ppid,pid,stat,comm --sort=uid,-ppid,+pid
  UID USER        PPID     PID STAT COMMAND
    0 root       12170  562880 S    systemd-userwor
    0 root       12170  563355 S    systemd-userwor
    0 root       12170  563522 S    systemd-userwor
    0 root        2655    2663 Ss   fusermount3
    0 root        1290    1339 Ssl+ Xorg
    0 root        1290    1857 S    sddm-helper
    0 root           2       3 S    pool_workqueue_release
    0 root           2       4 I<   kworker/R-rcu_gp
    0 root           2       5 I<   kworker/R-sync_wq
    0 root           2       6 I<   kworker/R-kvfree_rcu_reclaim
    0 root           2       7 I<   kworker/R-slub_flushwq
    0 root           2       8 I<   kworker/R-netns
    0 root           2      10 I<   kworker/0:0H-kblockd
    0 root           2      13 I<   kworker/R-mm_percpu_wq
    0 root           2      15 S    ksoftirqd/0
    0 root           2      16 I    rcu_preempt
    0 root           2      17 S    rcub/1
    0 root           2      18 S    rcu_exp_par_gp_kthread_worker/1
    0 root           2      19 S    rcu_exp_gp_kthread_worker
    0 root           2      20 S    migration/0
    0 root           2      21 S    kprobe-optimizer
    0 root           2      22 S    idle_inject/0
    0 root           2      23 S    cpuhp/0
    0 root           2      24 S    cpuhp/1
    0 root           2      25 S    idle_inject/1
    0 root           2      26 S    migration/1
    0 root           2      27 S    ksoftirqd/1
    0 root           2      29 I<   kworker/1:0H-kblockd
    0 root           2      30 S    cpuhp/2
    0 root           2      31 S    idle_inject/2
    0 root           2      32 S    migration/2
    0 root           2      33 S    ksoftirqd/2
    0 root           2      35 I<   kworker/2:0H-kblockd
    0 root           2      36 S    cpuhp/3
    0 root           2      37 S    idle_inject/3
    0 root           2      38 S    migration/3
    0 root           2      39 S    ksoftirqd/3
    0 root           2      41 I<   kworker/3:0H-kblockd
    0 root           2      42 S    cpuhp/4
    0 root           2      43 S    idle_inject/4
    0 root           2      44 S    migration/4
    0 root           2      45 S    ksoftirqd/4
    0 root           2      47 I<   kworker/4:0H-kblockd
    0 root           2      48 S    cpuhp/5
    0 root           2      49 S    idle_inject/5
    0 root           2      50 S    migration/5
    0 root           2      51 S    ksoftirqd/5
    0 root           2      53 I<   kworker/5:0H-kblockd
    0 root           2      54 S    cpuhp/6
    0 root           2      55 S    idle_inject/6
    0 root           2      56 S    migration/6
    0 root           2      57 S    ksoftirqd/6
    0 root           2      59 I<   kworker/6:0H-kblockd
    0 root           2      60 S    cpuhp/7
    0 root           2      61 S    idle_inject/7
    0 root           2      62 S    migration/7
    0 root           2      63 S    ksoftirqd/7
    0 root           2      65 I<   kworker/7:0H-kblockd
    0 root           2      66 S    cpuhp/8
    0 root           2      67 S    idle_inject/8
    0 root           2      68 S    migration/8
    0 root           2      69 S    ksoftirqd/8
    0 root           2      71 I<   kworker/8:0H-kblockd
    0 root           2      72 S    cpuhp/9
    0 root           2      73 S    idle_inject/9
    0 root           2      74 S    migration/9
    0 root           2      75 S    ksoftirqd/9
    0 root           2      77 I<   kworker/9:0H-kblockd
    0 root           2      78 S    cpuhp/10
    0 root           2      79 S    idle_inject/10
    0 root           2      80 S    migration/10
    0 root           2      81 S    ksoftirqd/10
    0 root           2      83 I<   kworker/10:0H-kblockd
    0 root           2      84 S    cpuhp/11
    0 root           2      85 S    idle_inject/11
    0 root           2      86 S    migration/11
    0 root           2      87 S    ksoftirqd/11
    0 root           2      89 I<   kworker/11:0H-kblockd
    0 root           2      90 S    cpuhp/12
    0 root           2      91 S    idle_inject/12
    0 root           2      92 S    migration/12
    0 root           2      93 S    ksoftirqd/12
    0 root           2      95 I<   kworker/12:0H-kblockd
    0 root           2      96 S    cpuhp/13
    0 root           2      97 S    idle_inject/13
    0 root           2      98 S    migration/13
    0 root           2      99 S    ksoftirqd/13
    0 root           2     101 I<   kworker/13:0H-kblockd
    0 root           2     102 S    cpuhp/14
    0 root           2     103 S    idle_inject/14
    0 root           2     104 S    migration/14
    0 root           2     105 S    ksoftirqd/14
    0 root           2     107 I<   kworker/14:0H-kblockd
    0 root           2     108 S    cpuhp/15
    0 root           2     109 S    idle_inject/15
    0 root           2     110 S    migration/15
    0 root           2     111 S    ksoftirqd/15
    0 root           2     113 I<   kworker/15:0H-kblockd
    0 root           2     114 S    cpuhp/16
    0 root           2     115 S    idle_inject/16
    0 root           2     116 S    migration/16
    0 root           2     117 S    ksoftirqd/16
    0 root           2     119 I<   kworker/16:0H-kblockd
    0 root           2     120 S    rcub/2
    0 root           2     121 S    rcu_exp_par_gp_kthread_worker/2
    0 root           2     122 S    cpuhp/17
    0 root           2     123 S    idle_inject/17
    0 root           2     124 S    migration/17
    0 root           2     125 S    ksoftirqd/17
    0 root           2     127 I<   kworker/17:0H-kblockd
    0 root           2     128 S    cpuhp/18
    0 root           2     129 S    idle_inject/18
    0 root           2     130 S    migration/18
    0 root           2     131 S    ksoftirqd/18
    0 root           2     133 I<   kworker/18:0H-kblockd
    0 root           2     134 S    cpuhp/19
    0 root           2     135 S    idle_inject/19
    0 root           2     136 S    migration/19
    0 root           2     137 S    ksoftirqd/19
    0 root           2     139 I<   kworker/19:0H-kblockd
    0 root           2     140 S    cpuhp/20
    0 root           2     141 S    idle_inject/20
    0 root           2     142 S    migration/20
    0 root           2     143 S    ksoftirqd/20
    0 root           2     145 I<   kworker/20:0H-kblockd
    0 root           2     146 S    cpuhp/21
    0 root           2     147 S    idle_inject/21
    0 root           2     148 S    migration/21
    0 root           2     149 S    ksoftirqd/21
    0 root           2     151 I<   kworker/21:0H-kblockd
    0 root           2     152 S    cpuhp/22
    0 root           2     153 S    idle_inject/22
    0 root           2     154 S    migration/22
    0 root           2     155 S    ksoftirqd/22
    0 root           2     157 I<   kworker/22:0H-kblockd
    0 root           2     158 S    cpuhp/23
    0 root           2     159 S    idle_inject/23
    0 root           2     160 S    migration/23
    0 root           2     161 S    ksoftirqd/23
    0 root           2     163 I<   kworker/23:0H-kblockd
    0 root           2     164 S    cpuhp/24
    0 root           2     165 S    idle_inject/24
    0 root           2     166 S    migration/24
    0 root           2     167 S    ksoftirqd/24
    0 root           2     169 I<   kworker/24:0H-kblockd
    0 root           2     170 S    cpuhp/25
    0 root           2     171 S    idle_inject/25
    0 root           2     172 S    migration/25
    0 root           2     173 S    ksoftirqd/25
    0 root           2     175 I<   kworker/25:0H-kblockd
    0 root           2     176 S    cpuhp/26
    0 root           2     177 S    idle_inject/26
    0 root           2     178 S    migration/26
    0 root           2     179 S    ksoftirqd/26
    0 root           2     181 I<   kworker/26:0H-kblockd
    0 root           2     182 S    cpuhp/27
    0 root           2     183 S    idle_inject/27
    0 root           2     184 S    migration/27
    0 root           2     185 S    ksoftirqd/27
    0 root           2     187 I<   kworker/27:0H-kblockd
    0 root           2     188 S    cpuhp/28
    0 root           2     189 S    idle_inject/28
    0 root           2     190 S    migration/28
    0 root           2     191 S    ksoftirqd/28
    0 root           2     193 I<   kworker/28:0H-kblockd
    0 root           2     194 S    cpuhp/29
    0 root           2     195 S    idle_inject/29
    0 root           2     196 S    migration/29
    0 root           2     197 S    ksoftirqd/29
    0 root           2     199 I<   kworker/29:0H-kblockd
    0 root           2     200 S    cpuhp/30
    0 root           2     201 S    idle_inject/30
    0 root           2     202 S    migration/30
    0 root           2     203 S    ksoftirqd/30
    0 root           2     205 I<   kworker/30:0H-kblockd
    0 root           2     206 S    cpuhp/31
    0 root           2     207 S    idle_inject/31
    0 root           2     208 S    migration/31
    0 root           2     209 S    ksoftirqd/31
    0 root           2     211 I<   kworker/31:0H-kblockd
    0 root           2     214 S    kdevtmpfs
    0 root           2     215 I<   kworker/R-inet_frag_wq
    0 root           2     216 I    rcu_tasks_kthread
    0 root           2     217 I    rcu_tasks_rude_kthread
    0 root           2     218 S    kauditd
    0 root           2     219 S    khungtaskd
    0 root           2     220 S    oom_reaper
    0 root           2     223 I<   kworker/R-writeback
    0 root           2     224 S    kcompactd0
    0 root           2     225 SN   ksmd
    0 root           2     226 SN   khugepaged
    0 root           2     227 I<   kworker/R-kblockd
    0 root           2     228 I<   kworker/R-blkcg_punt_bio
    0 root           2     229 I<   kworker/R-kintegrityd
    0 root           2     231 S    irq/9-acpi
    0 root           2     234 I<   kworker/R-tpm_dev_wq
    0 root           2     235 I<   kworker/R-ata_sff
    0 root           2     236 I<   kworker/R-edac-poller
    0 root           2     237 I<   kworker/R-devfreq_wq
    0 root           2     238 S    watchdogd
    0 root           2     240 I<   kworker/R-quota_events_unbound
    0 root           2     243 S    irq/27-AMD-Vi
    0 root           2     248 S    kswapd0
    0 root           2     249 I<   kworker/R-kthrotld
    0 root           2     251 S    irq/32-pciehp
    0 root           2     252 S    irq/36-pciehp
    0 root           2     253 I<   kworker/R-acpi_thermal_pm
    0 root           2     255 I<   kworker/R-mld
    0 root           2     256 I<   kworker/R-ipv6_addrconf
    0 root           2     257 I<   kworker/R-kstrp
    0 root           2     279 I<   kworker/R-zswap-shrink
    0 root           2     285 S    irq/28-ACPI:Event
    0 root           2     286 S    irq/29-ACPI:Event
    0 root           2     287 S    irq/30-ACPI:Event
    0 root           2     288 S    irq/31-ACPI:Event
    0 root           2     409 S    irq/74-ASUF1204:00
    0 root           2     410 I<   kworker/R-nvme-wq
    0 root           2     411 I<   kworker/R-nvme-reset-wq
    0 root           2     412 I<   kworker/R-nvme-delete-wq
    0 root           2     413 I<   kworker/R-nvme-auth-wq
    0 root           2     423 S    nv_queue
    0 root           2     424 S    nv_mem_pool_scrubber_queue
    0 root           2     425 S    nv_mem_pool_scrubber_queue
    0 root           2     426 S    nv_mem_pool_scrubber_queue
    0 root           2     427 S    nv_queue
    0 root           2     428 S    nv_open_q
    0 root           2     429 S    nvidia-modeset/kthread_q
    0 root           2     430 S    nvidia-modeset/deferred_close_kthread_q
    0 root           2     432 S    irq/96-nvidia
    0 root           2     433 S    nvidia
    0 root           2     434 S    nv_queue
    0 root           2     435 I<   kworker/R-USBC000:00-con1
    0 root           2     436 I<   kworker/R-amdgpu-reset-dev
    0 root           2     437 I<   kworker/R-ttm
    0 root           2     438 I<   kworker/R-amdgpu_dm_hpd_rx_offload_wq
    0 root           2     439 I<   kworker/R-amdgpu_dm_hpd_rx_offload_wq
    0 root           2     440 I<   kworker/R-amdgpu_dm_hpd_rx_offload_wq
    0 root           2     441 I<   kworker/R-amdgpu_dm_hpd_rx_offload_wq
    0 root           2     442 I<   kworker/R-amdgpu_dm_hpd_rx_offload_wq
    0 root           2     443 I<   kworker/R-dm_vblank_control_workqueue
    0 root           2     444 S    card2-crtc0
    0 root           2     445 S    card2-crtc1
    0 root           2     446 S    card2-crtc2
    0 root           2     447 S    card2-crtc3
    0 root           2     448 I<   kworker/R-gfx_0.0.0
    0 root           2     449 I<   kworker/R-gfx_0.1.0
    0 root           2     450 I<   kworker/R-comp_1.0.0
    0 root           2     451 I<   kworker/R-comp_1.1.0
    0 root           2     452 I<   kworker/R-comp_1.2.0
    0 root           2     453 I<   kworker/R-comp_1.3.0
    0 root           2     454 I<   kworker/R-comp_1.0.1
    0 root           2     455 I<   kworker/R-comp_1.1.1
    0 root           2     456 I<   kworker/R-comp_1.2.1
    0 root           2     457 I<   kworker/R-comp_1.3.1
    0 root           2     458 I<   kworker/R-sdma0
    0 root           2     459 I<   kworker/R-vcn_dec_0
    0 root           2     460 I<   kworker/R-vcn_enc_0.0
    0 root           2     461 I<   kworker/R-vcn_enc_0.1
    0 root           2     462 I<   kworker/R-jpeg_dec
    0 root           2     490 I<   kworker/R-btrfs-worker
    0 root           2     491 I<   kworker/R-btrfs-delalloc
    0 root           2     492 I<   kworker/R-btrfs-flush_delalloc
    0 root           2     493 I<   kworker/R-btrfs-cache
    0 root           2     494 I<   kworker/R-btrfs-fixup
    0 root           2     495 I<   kworker/R-btrfs-endio
    0 root           2     496 I<   kworker/R-btrfs-endio-meta
    0 root           2     497 I<   kworker/R-btrfs-rmw
    0 root           2     498 I<   kworker/R-btrfs-endio-write
    0 root           2     499 I<   kworker/R-btrfs-freespace-write
    0 root           2     500 I<   kworker/R-btrfs-delayed-meta
    0 root           2     501 I<   kworker/R-btrfs-qgroup-rescan
    0 root           2     502 S    btrfs-cleaner
    0 root           2     503 S    btrfs-transaction
    0 root           2     513 I<   kworker/12:1H-kblockd
    0 root           2     519 I<   kworker/2:1H-xfs-log/nvme1n1p3
    0 root           2     520 I<   kworker/3:1H-xfs-log/nvme1n1p3
    0 root           2     521 I<   kworker/0:1H-kblockd
    0 root           2     523 I<   kworker/13:1H-kblockd
    0 root           2     524 I<   kworker/28:1H-kblockd
    0 root           2     525 I<   kworker/18:1H-kblockd
    0 root           2     528 I<   kworker/19:1H-xfs-log/nvme1n1p3
    0 root           2     534 I<   kworker/14:1H-xfs-log/nvme1n1p3
    0 root           2     542 I<   kworker/6:1H-kblockd
    0 root           2     545 I<   kworker/8:1H-kblockd
    0 root           2     554 I<   kworker/1:1H-xfs-log/nvme1n1p3
    0 root           2     563 I<   kworker/4:1H-kblockd
    0 root           2     578 I<   kworker/10:1H-kblockd
    0 root           2     591 I<   kworker/16:1H-kblockd
    0 root           2     598 I<   kworker/7:1H-kblockd
    0 root           2     623 I<   kworker/20:1H-kblockd
    0 root           2     635 I<   kworker/5:1H-kblockd
    0 root           2     636 I<   kworker/22:1H-kblockd
    0 root           2     637 I<   kworker/23:1H-kblockd
    0 root           2     638 I<   kworker/17:1H-xfs-log/nvme1n1p3
    0 root           2     653 I<   kworker/9:1H-xfs-log/nvme1n1p3
    0 root           2     657 I<   kworker/29:1H-kblockd
    0 root           2     659 I<   kworker/15:1H-kblockd
    0 root           2     765 I<   kworker/11:1H-xfs-log/nvme1n1p3
    0 root           2     768 S    UVM global queue
    0 root           2     769 S    UVM deferred release queue
    0 root           2     770 S    UVM Tools Event Queue
    0 root           2     785 I<   kworker/R-cfg80211
    0 root           2     799 I<   kworker/21:1H-kblockd
    0 root           2     836 I<   kworker/26:1H-xfs-log/nvme1n1p3
    0 root           2     844 S    jbd2/nvme1n1p1-8
    0 root           2     845 I<   kworker/R-ext4-rsv-conversion
    0 root           2     852 S    irq/102-iwlwifi:default_queue
    0 root           2     853 S    irq/103-iwlwifi:queue_1
    0 root           2     854 S    irq/104-iwlwifi:queue_2
    0 root           2     855 S    irq/105-iwlwifi:queue_3
    0 root           2     856 S    irq/106-iwlwifi:queue_4
    0 root           2     857 S    irq/107-iwlwifi:queue_5
    0 root           2     858 S    irq/108-iwlwifi:queue_6
    0 root           2     859 S    irq/109-iwlwifi:queue_7
    0 root           2     860 S    irq/110-iwlwifi:queue_8
    0 root           2     861 S    irq/111-iwlwifi:queue_9
    0 root           2     862 S    irq/112-iwlwifi:queue_10
    0 root           2     863 S    irq/113-iwlwifi:queue_11
    0 root           2     864 S    irq/114-iwlwifi:queue_12
    0 root           2     865 S    irq/115-iwlwifi:queue_13
    0 root           2     866 S    irq/116-iwlwifi:queue_14
    0 root           2     867 S    irq/117-iwlwifi:exception
    0 root           2     869 I<   kworker/R-xfsalloc
    0 root           2     870 I<   kworker/R-xfs_mru_cache
    0 root           2     871 I<   kworker/R-xfs-buf/nvme1n1p3
    0 root           2     872 I<   kworker/R-xfs-conv/nvme1n1p3
    0 root           2     873 I<   kworker/R-xfs-reclaim/nvme1n1p3
    0 root           2     874 I<   kworker/R-xfs-blockgc/nvme1n1p3
    0 root           2     875 I<   kworker/R-xfs-inodegc/nvme1n1p3
    0 root           2     876 I<   kworker/R-xfs-log/nvme1n1p3
    0 root           2     877 I<   kworker/R-xfs-cil/nvme1n1p3
    0 root           2     878 S    xfsaild/nvme1n1p3
    0 root           2     879 I<   kworker/24:1H-xfs-log/nvme1n1p3
    0 root           2     881 I<   kworker/R-led_workqueue
    0 root           2     883 S    irq/98-cs35l41 IRQ1 Controller
    0 root           2     886 S    irq/98-cs35l41 IRQ1 Controller
    0 root           2     930 I<   kworker/30:1H-xfs-log/nvme1n1p3
    0 root           2    1019 I<   kworker/25:1H-kblockd
    0 root           2    1113 I<   kworker/31:1H-kblockd
    0 root           2    1180 I<   kworker/27:1H-kblockd
    0 root           2    1411 S    nvidia-drm/timeline-e2
    0 root           2    1511 S<   krfcommd
    0 root           2    2001 S    nvidia-drm/timeline-113
    0 root           2    2004 S    nvidia-drm/timeline-126
    0 root           2    2007 S    nvidia-drm/timeline-127
    0 root           2    2010 S    nvidia-drm/timeline-128
    0 root           2    2011 S    nvidia-drm/timeline-129
    0 root           2    2012 S    nvidia-drm/timeline-12a
    0 root           2    2013 S    nvidia-drm/timeline-12b
    0 root           2    2014 S    nvidia-drm/timeline-12c
    0 root           2    2015 S    nvidia-drm/timeline-12d
    0 root           2  153714 I    kworker/31:186-mm_percpu_wq
    0 root           2  368865 I    kworker/29:2-events_freezable
    0 root           2  375105 I    kworker/25:2-events
    0 root           2  401948 I    kworker/11:7-mm_percpu_wq
    0 root           2  436295 I    kworker/27:0-mm_percpu_wq
    0 root           2  463598 I    kworker/25:0-mm_percpu_wq
    0 root           2  469844 I<   kworker/u131:2-hci0
    0 root           2  472491 I    kworker/3:1-mm_percpu_wq
    0 root           2  485578 I    kworker/24:1-mm_percpu_wq
    0 root           2  490980 I    kworker/14:2-mm_percpu_wq
    0 root           2  494431 I    kworker/22:3-mm_percpu_wq
    0 root           2  494458 I    kworker/17:7-events
    0 root           2  498549 I    kworker/24:0
    0 root           2  500460 I    kworker/28:0-mm_percpu_wq
    0 root           2  505935 I    kworker/15:0-events
    0 root           2  517522 I    kworker/26:0-mm_percpu_wq
    0 root           2  520369 I    kworker/20:0-memcg
    0 root           2  525051 I    kworker/28:1-xfs-conv/nvme1n1p3
    0 root           2  527607 I    kworker/9:1-xfs-conv/nvme1n1p3
    0 root           2  532255 I    kworker/6:0-mm_percpu_wq
    0 root           2  532561 I    kworker/2:5-mm_percpu_wq
    0 root           2  532678 I    kworker/13:8-mm_percpu_wq
    0 root           2  534213 I    kworker/19:0-cgroup_free
    0 root           2  534657 I<   kworker/u131:0-hci0
    0 root           2  540265 I    kworker/23:0-mm_percpu_wq
    0 root           2  540863 I    kworker/u130:17-events_unbound
    0 root           2  541036 I    kworker/16:1-events
    0 root           2  541489 I    kworker/12:2
    0 root           2  541693 I    kworker/0:0-events
    0 root           2  541961 I    kworker/5:1-mm_percpu_wq
    0 root           2  542165 I    kworker/8:1-mm_percpu_wq
    0 root           2  542596 I    kworker/7:2
    0 root           2  542890 I    kworker/u129:7-events_unbound
    0 root           2  543460 I    kworker/1:2-mm_percpu_wq
    0 root           2  543475 I<   kworker/u132:12-ttm
    0 root           2  546114 I    kworker/18:2-mm_percpu_wq
    0 root           2  548148 I    kworker/27:1-events
    0 root           2  548394 I    kworker/29:0
    0 root           2  549551 I    kworker/16:0-events
    0 root           2  552452 I    kworker/19:2-mm_percpu_wq
    0 root           2  552545 I    kworker/26:2-events
    0 root           2  553146 I    kworker/7:1-mm_percpu_wq
    0 root           2  554148 I    kworker/31:1-cgroup_free
    0 root           2  555918 I    kworker/12:1-mm_percpu_wq
    0 root           2  556018 I    kworker/0:2
    0 root           2  556444 I    kworker/10:0-mm_percpu_wq
    0 root           2  556500 I    kworker/u128:0-sdma0
    0 root           2  557204 I    kworker/1:1
    0 root           2  557271 I    kworker/21:2-xfs-conv/nvme1n1p3
    0 root           2  557276 I    kworker/21:8-events
    0 root           2  557386 I    kworker/23:1
    0 root           2  557454 I    kworker/13:1
    0 root           2  557604 I    kworker/20:1-mm_percpu_wq
    0 root           2  557727 I<   kworker/u133:0-rb_allocator
    0 root           2  558130 I    kworker/5:0-xfs-conv/nvme1n1p3
    0 root           2  558233 I    kworker/u130:1-btrfs-endio-write
    0 root           2  558361 I    kworker/4:0-mm_percpu_wq
    0 root           2  558452 I<   kworker/u132:1-ttm
    0 root           2  558502 I    kworker/17:1-mm_percpu_wq
    0 root           2  558899 I    kworker/11:1
    0 root           2  559279 I    kworker/15:1-xfs-conv/nvme1n1p3
    0 root           2  559388 I    kworker/6:2-mm_percpu_wq
    0 root           2  560059 I    kworker/u129:0-btrfs-endio-write
    0 root           2  560092 I    kworker/8:2
    0 root           2  560593 I    kworker/18:1
    0 root           2  560603 I    kworker/2:1
    0 root           2  560631 I    kworker/30:1-mm_percpu_wq
    0 root           2  560634 I    kworker/30:5
    0 root           2  560635 I    kworker/9:3-mm_percpu_wq
    0 root           2  560975 I<   kworker/u133:6-ttm
    0 root           2  561094 I    kworker/u130:6-btrfs-endio-write
    0 root           2  561275 I    kworker/u128:2-sdma0
    0 root           2  561564 I    kworker/10:2
    0 root           2  561615 I    kworker/u129:4-btrfs-endio-write
    0 root           2  561912 I    kworker/u129:5-btrfs-endio-write
    0 root           2  561917 I    kworker/22:0
    0 root           2  562171 I    kworker/14:0
    0 root           2  562320 I    kworker/4:1
    0 root           2  562593 I<   kworker/u132:0-rb_allocator
    0 root           2  562615 I    kworker/u130:0-btrfs-endio-write
    0 root           2  562625 I    kworker/25:3
    0 root           2  562662 I    kworker/3:0-mm_percpu_wq
    0 root           2  562734 I    kworker/5:2
    0 root           2  562759 I    kworker/u130:2-btrfs-endio
    0 root           2  562760 I    kworker/u130:3-events_unbound
    0 root           2  562779 I    kworker/10:1
    0 root           2  563267 I<   kworker/u131:1
    0 root           2  563341 I    kworker/u129:1-flush-btrfs-1
    0 root           2  563343 I<   kworker/u133:1
    0 root           2  563359 I    kworker/u128:1-gfx_0.1.0
    0 root           2  563515 I<   kworker/u132:2-rb_allocator
    0 root           2  563543 I    kworker/31:0
    0 root           2  563576 I    kworker/u129:2-btrfs-endio
    0 root           2  563577 I    kworker/u129:3-btrfs-endio-write
    0 root           2  563578 I    kworker/u129:6-btrfs-endio-meta
    0 root           2  563579 I    kworker/u129:8-btrfs-endio-write
    0 root           2  563580 I    kworker/u129:9-writeback
    0 root           1    1004 S<sl auditd
    0 root           1    1012 Ssl  accounts-daemon
    0 root           1    1026 Ss   cron
    0 root           1    1038 Ssl  nvidia-powerd
    0 root           1    1057 Ss   smartd
    0 root           1    1059 Ssl  switcheroo-cont
    0 root           1    1063 Ss   systemd-logind
    0 root           1    1064 Ssl  udisksd
    0 root           1    1120 Ssl  lxcfs
    0 root           1    1170 Ssl  NetworkManager
    0 root           1    1175 Ss   wpa_supplicant
    0 root           1    1198 Ssl  ModemManager
    0 root           1    1269 Ss   lxc-monitord
    0 root           1    1281 Ssl  tuned
    0 root           1    1290 Ssl  sddm
    0 root           1    1293 Ssl  asusd
    0 root           1    1386 Ssl  tuned-ppd
    0 root           1    1391 Ssl  upowerd
    0 root           1   10670 Ss   systemd-journal
    0 root           1   11078 Ss   systemd-udevd
    0 root           1   12170 Ss   systemd-userdbd
    0 root           1   12662 Ss   bluetoothd
    0 root           1   42686 Ssl  fwupd
    0 root           1  270970 Ssl  cupsd
    0 root           0       1 Ss   systemd
    0 root           0       2 S    kthreadd
 1000 krysztal  561650  561670 Ssl  markdown-oxide
 1000 krysztal  561650  561740 S    inotifywait
 1000 krysztal  561650  563639 Rs   ps
 1000 krysztal  561649  561650 Ssl  nvim
 1000 krysztal  558710  561649 S+   nvim
 1000 krysztal  558694  558710 Ss   zsh
 1000 krysztal  553315  553365 Sl   Socket Process
 1000 krysztal  553315  553388 Sl   Isolated Web Co
 1000 krysztal  553315  553395 Sl   RDD Process
 1000 krysztal  553315  553754 Sl   WebExtensions
 1000 krysztal  553315  553817 Sl   Utility Process
 1000 krysztal  553315  553845 Sl   Web Content
 1000 krysztal  553315  553851 Sl   Web Content
 1000 krysztal  553315  553858 Sl   Web Content
 1000 krysztal  553155  553315 S    forkserver
 1000 krysztal  551616  551619 Sl   Socket Process
 1000 krysztal  551616  551647 Sl   Privileged Cont
 1000 krysztal  551616  551655 Sl   RDD Process
 1000 krysztal  551616  551696 Sl   Web Content
 1000 krysztal  551616  551791 Sl   WebExtensions
 1000 krysztal  551616  551926 Sl   Utility Process
 1000 krysztal  551616  554178 Sl   Isolated Web Co
 1000 krysztal  551616  554257 Sl   Isolated Web Co
 1000 krysztal  551616  554327 Sl   Isolated Web Co
 1000 krysztal  551616  554330 Sl   Isolated Web Co
 1000 krysztal  551616  554335 Sl   Isolated Web Co
 1000 krysztal  551616  554487 Sl   Isolated Web Co
 1000 krysztal  551616  555863 Sl   Isolated Web Co
 1000 krysztal  551616  557336 Sl   Isolated Web Co
 1000 krysztal  551616  559250 Sl   Isolated Web Co
 1000 krysztal  551616  559343 Sl   Isolated Web Co
 1000 krysztal  551616  559445 Sl   Isolated Web Co
 1000 krysztal  551616  559531 Sl   Isolated Web Co
 1000 krysztal  551616  559758 Sl   Isolated Web Co
 1000 krysztal  551616  560163 Sl   Web Content
 1000 krysztal  551616  560826 Sl   Web Content
 1000 krysztal  551616  561398 Sl   Web Content
 1000 krysztal  551520  551616 S    forkserver
 1000 krysztal  551519  551520 Sl   zen
 1000 krysztal  551515  551516 Sl   xdg-dbus-proxy
 1000 krysztal  551509  551519 S    bwrap
 1000 krysztal  533009  533201 S    rust-analyzer-p
 1000 krysztal  526803  526806 Sl   MainThread
 1000 krysztal  526573  526611 Sl   mcp-grafana
 1000 krysztal  526570  526803 S    sh
 1000 krysztal  526141  526570 Ssl  npm exec @mozil
 1000 krysztal  526141  526572 Ssl  dart:dartdev_ao
 1000 krysztal  526141  526573 Ssl  uv
 1000 krysztal  526122  526123 Sl+  fzf
 1000 krysztal  526073  526122 Ss+  sh
 1000 krysztal  526073  526141 Ssl+ pi
 1000 krysztal  526073  533009 Ssl  rust-analyzer
 1000 krysztal  526073  533358 Ssl  markdown-oxide
 1000 krysztal  526073  533699 Ssl  MainThread
 1000 krysztal  526072  526073 Ssl  nvim
 1000 krysztal  472708  526072 S+   nvim
 1000 krysztal  472690  472708 Ss   zsh
 1000 krysztal  437792  437793 Sl   glycin-image-rs
 1000 krysztal  437784  437792 S    bwrap
 1000 krysztal  372180  372181 Sl+  fzf
 1000 krysztal  333796  333999 S    rust-analyzer-p
 1000 krysztal  332503  332504 S    Discord
 1000 krysztal  332486  332553 Sl   Discord
 1000 krysztal  332479  332486 S    Discord
 1000 krysztal  332479  332488 Z    zypak-sandbox <defunct>
 1000 krysztal  332479  332559 Sl   Discord
 1000 krysztal  332479  332648 Sl   Discord
 1000 krysztal  332479  332751 Sl   Discord
 1000 krysztal  332479  437777 Sl   flatpak-spawn
 1000 krysztal  332474  332475 S    socat
 1000 krysztal  332474  332479 Sl   Discord
 1000 krysztal  332473  332474 S    com.discordapp.
 1000 krysztal  332473  332490 S    cat
 1000 krysztal  332473  332491 S    cat
 1000 krysztal  332473  332503 S    bwrap
 1000 krysztal  332473  332525 Sl   chrome_crashpad
 1000 krysztal  332469  332470 Sl   xdg-dbus-proxy
 1000 krysztal  332460  332473 S    bwrap
 1000 krysztal  331320  331321 Sl   MainThread
 1000 krysztal  331237  331272 Sl   mcp-grafana
 1000 krysztal  331233  331320 S    sh
 1000 krysztal  330998  331233 Ssl  npm exec @mozil
 1000 krysztal  330998  331234 Ssl  dart:dartdev_ao
 1000 krysztal  330998  331237 Ssl  uv
 1000 krysztal  330939  330998 Ssl+ pi
 1000 krysztal  330939  333796 Ssl  rust-analyzer
 1000 krysztal  330939  372180 Ss+  sh
 1000 krysztal  330938  330939 Ssl  nvim
 1000 krysztal  330672  330938 S+   nvim
 1000 krysztal  330653  330672 Ss   zsh
 1000 krysztal  164616  164618 Ss+  zsh
 1000 krysztal   89645   89646 Sl+  fzf
 1000 krysztal   36976   36979 SLl  scdaemon
 1000 krysztal   36038   36371 Sl   qq
 1000 krysztal   36038  561535 Sl   qq
 1000 krysztal   36036   36038 S    qq
 1000 krysztal   36035   36067 Sl   qq
 1000 krysztal   36031   36035 S    qq
 1000 krysztal   36031   36036 S    qq
 1000 krysztal   36031   36074 Sl   qq
 1000 krysztal   36031   36455 Sl   qq
 1000 krysztal   21961   22176 S    rust-analyzer-p
 1000 krysztal   21640   21641 Sl   MainThread
 1000 krysztal   21568   21640 S    sh
 1000 krysztal   21369   21568 Ssl  npm exec @mozil
 1000 krysztal   21369   21569 Ssl  dart:dartdev_ao
 1000 krysztal   21234   21369 Ssl+ pi
 1000 krysztal   21234   21961 Ssl  rust-analyzer
 1000 krysztal   21234   38268 Ssl  markdown-oxide
 1000 krysztal   21234   89645 Ss+  sh
 1000 krysztal   20025   20043 Z    sd_espeak-ng-mb <defunct>
 1000 krysztal   20025   20045 S    sd_espeak-ng
 1000 krysztal   20025   20060 Sl   sd_dummy
 1000 krysztal   20025   20063 S    sd_espeak-ng
 1000 krysztal   18965   18977 Sl   esbuild
 1000 krysztal   18954   18965 Sl   MainThread
 1000 krysztal   18261  332493 Ss   bwrap
 1000 krysztal   18261  437784 Ss   bwrap
 1000 krysztal   18145   18146 Sl   Telegram
 1000 krysztal   18141   18142 Sl   xdg-dbus-proxy
 1000 krysztal   18135   18145 S    bwrap
 1000 krysztal   12854  332647 S    p11-kit-remote
 1000 krysztal    2768    2860 Sl   bitwarden-app
 1000 krysztal    2767    2768 S    bitwarden-app
 1000 krysztal    2749    2829 Sl   bitwarden-app
 1000 krysztal    2734    2749 S    bitwarden-app
 1000 krysztal    2734    2751 Z    zypak-sandbox <defunct>
 1000 krysztal    2734    2835 Sl   bitwarden-app
 1000 krysztal    2733    2734 SLl  bitwarden-app
 1000 krysztal    2733    2753 S    cat
 1000 krysztal    2733    2754 S    cat
 1000 krysztal    2733    2767 S    bwrap
 1000 krysztal    2729    2730 Sl   xdg-dbus-proxy
 1000 krysztal    2600    2733 S    bwrap
 1000 krysztal    2094    2145 S    dbus-daemon
 1000 krysztal    1991    2059 S    fcitx5-wayland-
 1000 krysztal    1991    2064 Sl   Xwayland
 1000 krysztal    1977    1991 Sl   kwin_wayland
 1000 krysztal    1975   39293 S    ssh-agent
 1000 krysztal    1882    1885 S    (sd-pam)
 1000 krysztal    1882    1912 Ss   dbus-daemon
 1000 krysztal    1882    1913 S<sl pipewire
 1000 krysztal    1882    1916 Ss   mpris-proxy
 1000 krysztal    1882    1917 S<Lsl wireplumber
 1000 krysztal    1882    1918 Ssl  pipewire
 1000 krysztal    1882    1919 S<Lsl pipewire-pulse
 1000 krysztal    1882    1975 Ssl  gcr-ssh-agent
 1000 krysztal    1882    1977 Ssl  kwin_wayland_wr
 1000 krysztal    1882    1978 Ss   ssh-agent
 1000 krysztal    1882    2053 Ssl  knighttimed
 1000 krysztal    1882    2062 Sl   fcitx5
 1000 krysztal    1882    2094 Ssl  at-spi-bus-laun
 1000 krysztal    1882    2133 Ssl  ksmserver
 1000 krysztal    1882    2135 Ssl  kded6
 1000 krysztal    1882    2181 Ssl  plasmashell
 1000 krysztal    1882    2184 Sl   at-spi2-registr
 1000 krysztal    1882    2197 Ssl  dconf-service
 1000 krysztal    1882    2200 Ssl  kwalletmanager5
 1000 krysztal    1882    2229 Ssl  kactivitymanage
 1000 krysztal    1882    2244 SLl  kwalletd6
 1000 krysztal    1882    2247 Ssl  gmenudbusmenupr
 1000 krysztal    1882    2248 Ssl  kaccess
 1000 krysztal    1882    2249 Ssl  polkit-kde-auth
 1000 krysztal    1882    2253 Ssl  org_kde_powerde
 1000 krysztal    1882    2256 Ssl  xembedsniproxy
 1000 krysztal    1882    2324 S    xsettingsd
 1000 krysztal    1882    2332 Ssl  obexd
 1000 krysztal    1882    2473 Sl   kdeconnectd
 1000 krysztal    1882    2600 Ss   bwrap
 1000 krysztal    1882    2602 Ssl  jetbrains-toolb
 1000 krysztal    1882    2621 Ssl  xdg-desktop-por
 1000 krysztal    1882    2624 Ssl  DiscoverNotifie
 1000 krysztal    1882    2628 Ssl  kalendarac
 1000 krysztal    1882    2643 Ssl  xdg-permission-
 1000 krysztal    1882    2655 Ssl  xdg-document-po
 1000 krysztal    1882    2667 Ssl  xdg-desktop-por
 1000 krysztal    1882    2706 Ssl  xdg-desktop-por
 1000 krysztal    1882    2729 S    bwrap
 1000 krysztal    1882    2755 Ss   bwrap
 1000 krysztal    1882    3092 Sl   jetbrainsd
 1000 krysztal    1882   12849 Ssl  flatpak-session
 1000 krysztal    1882   12854 Ss   p11-kit-server
 1000 krysztal    1882   18069 Ssl  krunner
 1000 krysztal    1882   18135 S    bwrap
 1000 krysztal    1882   18141 S    bwrap
 1000 krysztal    1882   18261 Ssl  flatpak-portal
 1000 krysztal    1882   18954 Ssl  MainThread
 1000 krysztal    1882   20025 Ssl  speech-dispatch
 1000 krysztal    1882   21234 Ssl  nvim
 1000 krysztal    1882   36031 Ssl  qq
 1000 krysztal    1882   36052 Sl   chrome_crashpad
 1000 krysztal    1882   36974 Ss   keyboxd
 1000 krysztal    1882   36976 SLsl gpg-agent
 1000 krysztal    1882   83210 S    catatonit
 1000 krysztal    1882  108333 Sl   java
 1000 krysztal    1882  164613 Ss   pasta.avx2
 1000 krysztal    1882  164616 Ss   conmon
 1000 krysztal    1882  330653 Ssl  alacritty
 1000 krysztal    1882  332460 Ss   bwrap
 1000 krysztal    1882  332469 S    bwrap
 1000 krysztal    1882  472690 Ssl  alacritty
 1000 krysztal    1882  551509 Ss   bwrap
 1000 krysztal    1882  551515 S    bwrap
 1000 krysztal    1882  553155 Sl   firefox-bin
 1000 krysztal    1882  553160 Sl   crashhelper
 1000 krysztal    1882  558694 Ssl  alacritty
 1000 krysztal    1857    1939 Ssl+ startplasma-way
 1000 krysztal       1    1882 Ss   systemd
 1000 krysztal       1    1933 SLl  ksecretd
```

是否还记得我们定义了 `--sort=uid,-ppid,+pid` 参数？此时我们来确定他的语义：

- `uid` ：按 `uid` 升序。无前缀等价于 `+`，默认方向就是"数值/字典升序"
- `-ppid` ：主键并列时，按 `ppid` 降序。`-` 只反转它紧邻的这一个键，不影响其他键
- `+pid` ：前两个键都并列时，按 `pid` 升序(`+` 写了和没写一样，纯显式）

什么你说不好理解，真拿你没办法，人再笨还学不会 SQL 吗？

```sql
-- 假设在 output 表
SELECT *
FROM output
ORDER BY uid ASC, ppid DESC, pid ASC
```

### 借用 SQL/Rust 来进行理解

在刚刚我写了一条 SQL，那么借助这个 SQL 来进行理解：对 `uid` 进行排序，然后基于 `uid` 的排序结果对 `ppid` 进行降序，最后在前者的结果上按照 `pid` 进行升序，_并且始终不违背前者的排序结果_。

行吧，那我还是写个 Rust 风格伪代码吧：

```rust
fn cmp_rows(a: &Row, b: &Row) -> Ordering {
   a.uid.cmp(&b.uid)                      // 主键
       .then_with(|| b.ppid.cmp(&a.ppid)) // 平局才求值(惰性),降序
       .then_with(|| a.pid.cmp(&b.pid))   // 再平局才求值
}

rows.sort_by(cmp_rows);
```

这样就能看懂了，实质上这是一刻*逐级精细化的决策树*！ :gleeful:

### 使用 SQLite 来帮助我们验证一下

接下来我们使用 SQLite 复刻一下我们的猜想，这段代码请 AI 大人帮我写就好了。

```python fold
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""对照实验:Rust 风格比较器 vs SQLite ORDER BY。

复刻 `ps --sort=uid,-ppid,+pid`(等价 SQL:ORDER BY uid ASC, ppid DESC, pid ASC)。
零依赖,sqlite3 是标准库。运行:uv run ps_multisort_demo.py
"""

import functools
import sqlite3

# 摘自真实 `ps -eo uid,ppid,pid,comm` 输出,平局结构是刻意的:
# uid 大量并列 → ppid 并列 → 最后靠 pid 决胜
ROWS = [
    {"uid": 0,    "ppid": 12170, "pid": 557285, "comm": "systemd-userwor"},
    {"uid": 0,    "ppid": 12170, "pid": 558099, "comm": "systemd-userwor"},
    {"uid": 0,    "ppid": 12170, "pid": 558405, "comm": "systemd-userwor"},
    {"uid": 0,    "ppid": 2655,  "pid": 2663,   "comm": "fusermount3"},
    {"uid": 0,    "ppid": 1290,  "pid": 1857,   "comm": "sddm-helper"},
    {"uid": 0,    "ppid": 1290,  "pid": 1339,   "comm": "Xorg"},
    {"uid": 0,    "ppid": 2,     "pid": 15,     "comm": "ksoftirqd/0"},
    {"uid": 0,    "ppid": 2,     "pid": 3,      "comm": "pool_workqueue"},
    {"uid": 0,    "ppid": 2,     "pid": 16,     "comm": "rcu_preempt"},
    {"uid": 0,    "ppid": 2,     "pid": 4,      "comm": "kworker/R-rcu_gp"},
    {"uid": 1000, "ppid": 1882,  "pid": 553155, "comm": "firefox-bin"},
    {"uid": 1000, "ppid": 1882,  "pid": 3092,   "comm": "jetbrainsd"},
    {"uid": 1000, "ppid": 1882,  "pid": 108333, "comm": "java"},
    {"uid": 1000, "ppid": 1882,  "pid": 12849,  "comm": "flatpak-session"},
    {"uid": 1000, "ppid": 1882,  "pid": 21234,  "comm": "nvim"},
    {"uid": 1000, "ppid": 1,     "pid": 1933,   "comm": "ksecretd"},
    {"uid": 1000, "ppid": 1,     "pid": 1882,   "comm": "systemd"},
    {"uid": 1000, "ppid": 1857,  "pid": 1939,   "comm": "startplasma-way"},
]

FIELDS = ("uid", "ppid", "pid", "comm")


def sort_like_rust(rows):
    # 与文章中的 Rust 代码逐行对应:
    #   a.uid.cmp(&b.uid)                          // 主键
    #       .then_with(|| b.ppid.cmp(&a.ppid))     // 平局才比较,降序
    #       .then_with(|| a.pid.cmp(&b.pid))       // 再平局才比较
    def cmp_rows(a, b):
        if a["uid"] != b["uid"]:
            return -1 if a["uid"] < b["uid"] else 1
        if a["ppid"] != b["ppid"]:
            return -1 if b["ppid"] < a["ppid"] else 1
        return (a["pid"] > b["pid"]) - (a["pid"] < b["pid"])

    return sorted(rows, key=functools.cmp_to_key(cmp_rows))


def sort_by_sqlite(rows):
    con = sqlite3.connect(":memory:")
    con.execute(f"CREATE TABLE p ({', '.join(FIELDS)})")
    con.executemany(
        f"INSERT INTO p VALUES ({', '.join('?' * len(FIELDS))})",
        ([row[f] for f in FIELDS] for row in rows),
    )
    rows_out = con.execute("SELECT * FROM p ORDER BY uid ASC, ppid DESC, pid ASC")
    return [dict(zip(FIELDS, t)) for t in rows_out]


def main():
    rust_side, sqlite_side = sort_like_rust(ROWS), sort_by_sqlite(ROWS)
    assert rust_side == sqlite_side, "两种方法结果不一致!"

    print("排序规格 : --sort=uid,-ppid,+pid")
    print("等价 SQL : ORDER BY uid ASC, ppid DESC, pid ASC")
    print(f"数据     : 内置示例({len(ROWS)} 行,两种方法结果一致)\n")

    print(f"{'UID':>6} {'PPID':>6} {'PID':>7}  COMMAND")
    prev = None
    for row in rust_side:
        if prev is not None and row["uid"] != prev:  # 主键跨组时分一行
            print("  " + "-" * 38)
        prev = row["uid"]
        print(f"{row['uid']:>6} {row['ppid']:>6} {row['pid']:>7}  {row['comm']}")


if __name__ == "__main__":
    main()
```

然后可以使用各种工具来检查它是否符合我们的预期，很明显是符合我们的观测的。

## 实现

道理就先说到这里，显然非常麻烦的是我们要*怎么实现*这些东西？然后又怎么使得其更加通用？

试想一下：我们以行为储存，以列为行为基准，基于列的数据进行操作得到行的顺序，那么实际上我们是设计了非常小的一款数据库。

兜兜转转，回到了 SQLite 的怀抱。不过我们需要继续限定一下：我们做的不是储存，而是一个小型的*查询引擎*

### 参照

自参与 `uutils/procps` 以来，在没有引入 TUI 界面的时候我都是直接使用了 [`prettytable-rs`](https://crates.io/crates/prettytable-rs) 这个库，十分感谢开发者们的付出。

在本轮的调研中我深入查看了这些库

- [`prettytable-rs`](https://crates.io/crates/prettytable-rs): 我们最原始的 Table 引擎
- [tabled](https://crates.io/crates/tabled)：另外一款很流行的输出 Table 的库

非常感谢他们的付出！

### 行模式

在查看 `tabled` 的时候我看到了一个很聪明的写法：使用 `Tabled` 这个派生宏来自动将字段转换成行模式：

```rust fold
use tabled::Tabled;

#[derive(Tabled)]
struct Language<'a> {
    name: &'a str,
    designed_by: &'a str,
    invented_year: usize,
}
```

有了行模式，我们相当于免费获得了如下内容：

- 表头：始终可以获得表头的布局
- 输入验证：始终有机会验证输入是否合法，因为我们可以将字段布局展平成为元组作为输入的类型
- 借用 `std` 生态的排序：只要类型实现了 `PartialOrd` 这个 `trait` 就可以参与排序

那么接下来的考虑便出现了：如何储存异构内容？比如一个 `(u8, u16, u32, String)` 的行类型我应该怎么储存？

### 行储存

在 Rust 中，我们可以使用 `&dyn Trait` 的方式动态派发类型，但显然我们还需要定义如何获取其中的数据、如何解析等等等行为。这是非常复杂的且完全不符合人体工程学的，所以我们应该有更好的选择。

我的希望是可以利用类型在编译期进行检查，而非在运行时动态检查杂七杂八的东西。而对于一行的数据，且其为异构，我们可以让行就是一个普通的结构体，再用派生宏把字段布局展平成编译期元数据。

> [!NOTE]
> `enum`？不不不，是结构体与派生宏这个组合。
>
> 使用宏，我们可以轻松做到类似静态反射一样的事情。
>
> 不过我们依然需要定义支持的类型，但这方面的事情是在编译期为编译期服务

考虑到为编译器服务，我们还是需要定义一组列类型来标记行布局。别忘了，我们至关重要的 `Option` 也是其中一员：

```rust fold
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[rustfmt::skip]
pub enum ColumnKind {
    F64, F32,
    I128, I16, I32, I64, I8, ISize,
    U128, U16, U32, U64, U8, USize,
    String,
    Bool,
    /// A nullable column: the kind of the inner, non-`Option` type.
    Optional(&'static ColumnKind),
}
```

于是行定义可以收束成一个 `trait`：表头与列类型都是编译期常量，再配一个按列下标取用单元格的方法。配套的 `ColumnType` 约束了合法的单元格类型（`Sized + 'static + Clone`，并带一个 `const KIND` 指回对应的 `ColumnKind`），`Option<T>` 则经 blanket impl 自动成为可空列：

```rust fold
pub trait NamedRow: Sized {
    const KINDS: &'static [ColumnKind];   // 列类型，字段序
    const NAMES: &'static [&'static str]; // 表头，字段序
    fn cell_as<T: ColumnType>(&self, index: usize) -> Option<&T>;
}
```

对于如下的结构体，只要派生一次就免费获得了行定义：

```rust fold
#[derive(NamedRow)]
struct Language {
    name: String,
    designed_by: String,
    invented_year: usize,
}
```

注意到，我们用了某种方式自动获取到了 `KINDS` 与 `NAMES`，这便是行定义，专门用于定义行类型且为自动派生（当然也可以手写 `impl`，毫无问题）。派生宏还顺手生成了 `From<元组>` 的桥接，于是元组字面量依然能作为构造一行的语法糖喂给 `push`，但元组自身不实现任何 `trait`。

> [!NOTE]
>
> 这些只是思维模式，具体实现需要看具体代码

在这个设计之上，我们的行储存就变成了这样的类型：`Vec<Language>`，还获得编译期的灵活性，可以遍历 `Language::KINDS` 在运行时做一些事情。看起来很符合直觉，且非常安全的类型化了。

随后我们再想办法看看表头在 `Table` 一侧怎么处理。

### 表头

表头其实就是非常简单的做法了：默认表头已经由派生宏写进了 `NamedRow::NAMES`，是编译期常量；而 `Table` 内部则用 `Vec<String>` 储存一份，为自定义表头留出余地。出于偷懒的目的，直接存 `String` 就行。

依旧是之前的结构体，其默认表头如下所示

```rust fold
struct Language {
    name: String,
    designed_by: String,
    invented_year: usize,
}

// 派生宏生成的 impl 里：
const NAMES: &'static [&'static str] = &["name", "designed_by", "invented_year"];
```

### 表储存

好了，现在我们得到了如下的东西：

- 行类型定义：实现了 `NamedRow` 的结构体
- 表头定义：默认是 `R::NAMES`，`Table` 内部存 `Vec<String>`
- 储存方式：按照行储存，使用 `Vec` 即可

那我们顺理成章就可以得到类型定义：

```rust fold
pub struct Table<R: NamedRow> {
    names: Vec<String>,
    rows: Vec<R>,
}
```

其中泛型 `R` 的定义为行类型，唯一的约束就是实现 `NamedRow`。

### 读与写

```rust fold
impl<R: NamedRow> Table<R> {
    pub fn new(names: impl IntoIterator<Item = impl Into<String>>) -> Self;
    pub fn push(&mut self, row: impl Into<R>);
    pub fn get_as<T: ColumnType>(&self, row: usize, column: usize) -> Option<&T>;
    pub fn kinds(&self) -> &'static [ColumnKind];
    // 其余皆为常规容器访问器
}
```

- `new` 接受自定义表头，为 `ps -o uid=HDR` 式的需求保留；日常构造走零参数的 `Default`，表头就是 `R::NAMES`。
- `push` 接受 `impl Into<R>`，类型与元数检查全在编译期，所以签名里连 `Result` 都不需要。
- `get_as` 其实没有任何***转换***：只是 `self.row(row)?.cell_as(column)`，按列下标借用后 `downcast_ref` 到 `T`
    - 返回 `None` 意味着下标越界**或** `T` 与该列静态类型不符。因为拿错类型是调用方的问题，不是运行时的失败模式。

### 排序

好了，地基打完，终于可以回到核心问题本身。比较器链的语义前面已经验证过，剩下的麻烦只有一个：如何在运行时用*列名 + 方向*的键列表把这棵决策树搭起来？

回想起我们先前的决定：我们引入了泛型，那么我们也可以约束一下泛型参数必须要实现 `PartialOrd`，这样我们就把这个操作留给了类型层，可以被类型系统在编译期处理干净。

不过有个例外：浮点类型没有实现 `PartialOrd`，给了个 `total_cmp`。基于这个考虑，我想可能只能折中一下约束必须要实现一个 `cmp` 函数。

给 `ColumnType` 加一个必需的 `cmp`（浮点用 `total_cmp` 就行），这样下来通过派生宏生成 `cmp_cell` 时连字段类型都不需要知道是什么：

```rust fold
pub trait ColumnType {
    fn cmp(a: &Self, b: &Self) -> Ordering;
}

pub trait NamedRow: Sized {
    // ...
    fn cmp_cell(&self, other: &Self, index: usize) -> Option<Ordering>;
}
```

`Table` 一侧只需要有结构化的键和一个稳定排序：

```rust fold
pub enum SortDirection { Ascending, Descending }

impl<R: NamedRow> Table<R> {
    pub fn sort(&mut self, keys: impl IntoIterator<Item = (impl AsRef<str>, SortDirection)>) -> Option<()>;
}
```

> [!NOTE]
>
> `--sort=uid,-ppid,+pid` 这种小 DSL 的解析？不不不，那不是我们这个 crate 该做的事，用户会自己找到出路。

### 投影

至于选中留下什么列，那就更简单了：一个只读视图，构造时把*投影坐标*到*表坐标*的翻译一次绑死，之后 `get_as` 直接用投影本地的下标：

```rust fold
impl<R: NamedRow> Table<R> {
    pub fn project(&self, names: impl IntoIterator<Item = impl AsRef<str>>) -> Option<Projection<'_, R>>;
}
```

`sort(&mut self)` 和 `Projection<'_, R>` 的借用天然互斥，借用检查器会强制我们先排序后投影。这样下来 `ps -o pid --sort=ppid` 的形态就这么成立了。

## 最后我们得到了什么？

很显然的，我们得到了一个还算可以的 `Table` 容器，支持很标准的增删查改，还有最重要的：

- 细化决策树：`sort` 输入 `Vec<(String, SortDirection)>` 键列表，使用稳定排序
- 选中留下什么列，去掉什么列：`project` 给出只读投影

并且根据上面的需求，我们始终可以为单元格引入一个 `Cell` 类型来对其进行配置

> [!NOTE]
>
> 还是那句话，要看具体代码是怎么实现的，上面只是提供了我的思路

代码开源在了 [sortable](https://github.com/Krysztal112233/sortable) 中
