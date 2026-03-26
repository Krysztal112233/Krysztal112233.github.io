---
title: ZFS 降级事故
date: 2026-03-26 22:34:37
tags:
    - Linux
    - 笔记
    - 存储
    - DevOps
---

记录一次 ZFS degraded.

<!-- more -->

本来在做数据集备份的，然后发现有一块盘提示 **DEGRADED**。心头一紧，完了。

```bash
root in 🌐 homelab in ~
❯ zpool status -x
  pool: bulk
 state: DEGRADED
status: One or more devices could not be used because the label is missing or
        invalid.  Sufficient replicas exist for the pool to continue
        functioning in a degraded state.
action: Replace the device using 'zpool replace'.
   see: https://openzfs.github.io/openzfs-docs/msg/ZFS-8000-4J
  scan: scrub repaired 0B in 06:05:15 with 0 errors on Sun Mar  8 06:29:16 2026
config:

        NAME                                   STATE     READ WRITE CKSUM
        bulk                                   DEGRADED     0     0     0
          raidz1-0                             DEGRADED     0     0     0
            10331498304071247840               FAULTED      0     0     0  was /dev/sda1
            ata-ST12000NM005G-2MT133_ZL28N553  ONLINE       0     0     0
            ata-ST12000NM005G-2MT133_ZLW1X3BT  ONLINE       0     0     0
        cache
          c1256568-01                          ONLINE       0     0     0

errors: No known data errors
```

## 检查具体盘块

`zpool` 命令给了一串意义不明的数字，暂时不知道为什么是这样分配的。

但是与此同时也给了具体是 `/dev/sda1` 损坏，因此查看一下具体是哪儿块盘就好：

```bash
root in 🌐 homelab in ~
❯ lsblk -o NAME,SIZE,MODEL,SERIAL
NAME          SIZE MODEL                         SERIAL
sda          10.9T ST12000NM005G-2MT133          ZLW1X3BT
├─sda1       10.9T
└─sda9          8M
sdb          10.9T ST12000NM005G-2MT133          ZL28N553
├─sdb1       10.9T
└─sdb9          8M
sdc          10.9T ST12000NM005G-2MT133          ZL28ED42
├─sdc1       10.9T
└─sdc9          8M
sdd           1.7T INTEL SSDSC2KB019T8           PHYF102500VU1P9DGN
├─sdd1        1.7T
└─sdd9          8M
sde           1.7T INTEL SSDSC2KB019T8           PHYF102500NN1P9DGN
├─sde1        1.7T
└─sde9          8M
nvme0n1     119.2G AirDisk 128GB SSD             QG8656B006640P110N
├─nvme0n1p1   3.7G
├─nvme0n1p2  14.9G
└─nvme0n1p3 100.6G
nvme1n1     953.9G WD PC SN560 SDDPNQE-1T00-1002 233506402946
├─nvme1n1p1 715.3G
└─nvme1n1p2 238.6G
```

对应到 `/dev/sda1`, 那就是序列号为 `ZLW1X3BT` 的盘坏掉了

## 深入检查

但是现在依然不清楚为什么盘会突然失效导致 `RAIDZ1` 降级，具体要继续深入。

检查 zpool 给的[网址](https://openzfs.github.io/openzfs-docs/msg/ZFS-8000-4J)，可以得到如下信息：

> Message ID: ZFS-8000-4J
>
> Corrupted device label in a replicated configuration
>
> | **Type:**               | Error                                                                  |
> | ----------------------- | ---------------------------------------------------------------------- |
> | **Severity:**           | Major                                                                  |
> | **Description:**        | A device could not be opened due to a missing or invalid device label. |
> | **Automated Response:** | A hot spare will be activated if available.                            |
> | **Impact:**             | The pool is no longer providing the configured level of replication.   |

意思是 ZFS 的标签损坏，不一定是盘本身有问题。请出 `smart` 工具看看原因

### S.M.A.R.T.

```bash
root in 🌐 homelab in ~ took 8s
❯ smartctl -a /dev/disk/by-id/ata-ST12000NM005G-2MT133_ZL28ED42
smartctl 7.5 2025-04-30 r5714 [x86_64-linux-6.19.6+deb14-amd64] (local build)
Copyright (C) 2002-25, Bruce Allen, Christian Franke, www.smartmontools.org

=== START OF INFORMATION SECTION ===
Device Model:     ST12000NM005G-2MT133
Serial Number:    ZL28ED42
LU WWN Device Id: 5 000c50 0c707bbf3
Add. Product Id:  DELL(tm)
Firmware Version: EAL6
User Capacity:    12,000,138,625,024 bytes [12.0 TB]
Sector Sizes:     512 bytes logical, 4096 bytes physical
Rotation Rate:    7200 rpm
Form Factor:      3.5 inches
Device is:        Not in smartctl database 7.5/5706
ATA Version is:   ACS-4 (minor revision not indicated)
SATA Version is:  SATA 3.3, 6.0 Gb/s (current: 6.0 Gb/s)
Local Time is:    Thu Mar 26 21:20:08 2026 CST
SMART support is: Available - device has SMART capability.
SMART support is: Enabled

=== START OF READ SMART DATA SECTION ===
SMART overall-health self-assessment test result: PASSED

General SMART Values:
Offline data collection status:  (0x00) Offline data collection activity
                                        was never started.
                                        Auto Offline Data Collection: Disabled.
Self-test execution status:      (   0) The previous self-test routine completed
                                        without error or no self-test has ever
                                        been run.
Total time to complete Offline
data collection:                (   90) seconds.
Offline data collection
capabilities:                    (0x71) SMART execute Offline immediate.
                                        No Auto Offline data collection support.
                                        Suspend Offline collection upon new
                                        command.
                                        No Offline surface scan supported.
                                        Self-test supported.
                                        Conveyance Self-test supported.
                                        Selective Self-test supported.
SMART capabilities:            (0x0003) Saves SMART data before entering
                                        power-saving mode.
                                        Supports SMART auto save timer.
Error logging capability:        (0x01) Error logging supported.
                                        General Purpose Logging supported.
Short self-test routine
recommended polling time:        (   1) minutes.
Extended self-test routine
recommended polling time:        (1089) minutes.
Conveyance self-test routine
recommended polling time:        (   2) minutes.
SCT capabilities:              (0x70bd) SCT Status supported.
                                        SCT Error Recovery Control supported.
                                        SCT Feature Control supported.
                                        SCT Data Table supported.

SMART Attributes Data Structure revision number: 10
Vendor Specific SMART Attributes with Thresholds:
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x010f   100   064   044    Pre-fail  Always       -       824864
  3 Spin_Up_Time            0x0103   091   087   000    Pre-fail  Always       -       0
  4 Start_Stop_Count        0x0032   100   100   020    Old_age   Always       -       57
  5 Reallocated_Sector_Ct   0x0133   100   100   010    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x000f   080   060   045    Pre-fail  Always       -       102215035
  9 Power_On_Hours          0x0032   061   061   000    Old_age   Always       -       34919
 10 Spin_Retry_Count        0x0013   100   100   097    Pre-fail  Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   020    Old_age   Always       -       53
 18 Unknown_Attribute       0x000b   100   100   050    Pre-fail  Always       -       0
187 Reported_Uncorrect      0x0032   100   100   000    Old_age   Always       -       0
188 Command_Timeout         0x0032   100   099   000    Old_age   Always       -       8590065668
190 Airflow_Temperature_Cel 0x0022   071   050   040    Old_age   Always       -       29 (Min/Max 23/40)
192 Power-Off_Retract_Count 0x0032   100   100   000    Old_age   Always       -       42
193 Load_Cycle_Count        0x0032   092   092   000    Old_age   Always       -       17526
194 Temperature_Celsius     0x0022   029   050   000    Old_age   Always       -       29 (0 15 0 0 0)
197 Current_Pending_Sector  0x0012   100   100   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0010   100   100   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x003e   200   200   000    Old_age   Always       -       0
200 Multi_Zone_Error_Rate   0x0023   100   100   001    Pre-fail  Always       -       0
240 Head_Flying_Hours       0x0000   100   253   000    Old_age   Offline      -       24519 (206 253 0)
241 Total_LBAs_Written      0x0000   100   253   000    Old_age   Offline      -       235469632312
242 Total_LBAs_Read         0x0000   100   253   000    Old_age   Offline      -       4267211186416

SMART Error Log Version: 1
No Errors Logged

SMART Self-test log structure revision number 1
Num  Test_Description    Status                  Remaining  LifeTime(hours)  LBA_of_first_error
# 1  Extended offline    Completed without error       00%     31056         -
# 2  Vendor (0xdf)       Completed without error       00%         3         -
# 3  Short offline       Completed without error       00%         1         -

SMART Selective self-test log data structure revision number 1
 SPAN  MIN_LBA  MAX_LBA  CURRENT_TEST_STATUS
    1        0        0  Not_testing
    2        0        0  Not_testing
    3        0        0  Not_testing
    4        0        0  Not_testing
    5        0        0  Not_testing
Selective self-test flags (0x0):
  After scanning selected spans, do NOT read-scan remainder of disk.
If Selective self-test is pending on power-up, resume after 0 minute delay.

The above only provides legacy SMART information - try 'smartctl -x' for more
```

根据 smart 信息来看，这块盘还算是健康。GPT 解析认为这块盘可能有经历过：

- 盘短暂失联
- HBA / SATA 背板 / 电源不稳
- 系统重启、热插拔、总线重置
- 设备忙到超时，而不是盘面坏

但依然不影响总体健康情况。

## 重审视

现在的情况明了，结论比较偏向 ZFS 没有成功重关联盘的信息，使用 zdb 检查一下这块盘的 label：

```bash
root in 🌐 homelab in ~
❯ zdb -l /dev/disk/by-id/ata-ST12000NM005G-2MT133_ZL28ED42-part1
------------------------------------
LABEL 0
------------------------------------
    version: 5000
    name: 'bulk'
    state: 0
    txg: 2425395
    pool_guid: 1560922927800853045
    errata: 0
    min_alloc: 4096
    max_alloc: 4096
    hostid: 367074959
    hostname: 'homelab'
    top_guid: 16729480470073721455
    guid: 10331498304071247840
    hole_array[0]: 1
    vdev_children: 2
    vdev_tree:
        type: 'raidz'
        id: 0
        guid: 16729480470073721455
        nparity: 1
        metaslab_array: 512
        metaslab_shift: 34
        ashift: 12
        asize: 36000370262016
        min_alloc: 4096
        is_log: 0
        create_txg: 4
        children[0]:
            type: 'disk'
            id: 0
            guid: 10331498304071247840
            path: '/dev/sda1'
            devid: 'ata-ST12000NM005G-2MT133_ZL28ED42-part1'
            phys_path: 'pci-0000:c1:00.0-ata-1.0'
            whole_disk: 1
            DTL: 17352
            create_txg: 4
        children[1]:
            type: 'disk'
            id: 1
            guid: 16221263122293960021
            path: '/dev/disk/by-id/ata-ST12000NM005G-2MT133_ZL28N553-part1'
            devid: 'ata-ST12000NM005G-2MT133_ZL28N553-part1'
            phys_path: 'pci-0000:c1:00.0-ata-2.0'
            whole_disk: 1
            DTL: 17351
            create_txg: 4
        children[2]:
            type: 'disk'
            id: 2
            guid: 17765960766568586256
            path: '/dev/disk/by-id/ata-ST12000NM005G-2MT133_ZLW1X3BT-part1'
            devid: 'ata-ST12000NM005G-2MT133_ZLW1X3BT-part1'
            phys_path: 'pci-0000:c1:00.0-ata-3.0'
            whole_disk: 1
            DTL: 17350
            create_txg: 4
    features_for_read:
        com.delphix:hole_birth
        com.delphix:embedded_data
        com.klarasystems:vdev_zaps_v2
    labels = 0 1 2 3
```

看起来可以读取到 label 里的信息。根据手册中的指导，在这种情况下可以尝试重新上线一下设备：

```bash
root in 🌐 homelab in ~
❯ zpool online bulk /dev/disk/by-id/ata-ST12000NM005G-2MT133_ZL28ED42-part1
couldn't find device "/dev/disk/by-id/ata-ST12000NM005G-2MT133_ZL28ED42-part1" in pool "bulk"
```

看起来不行，那重启一下试试，毕竟盘是正常的

> [!NOTE]
> 不要学我，我这个机子可以随便重启。正确的操作是使用 `replace` 开始重建

## 终局

好吧然后他就开始自己重建了...

```bash
root in 🌐 homelab in ~
❯ zpool status
  pool: bulk
 state: ONLINE
status: One or more devices is currently being resilvered.  The pool will
        continue to function, possibly in a degraded state.
action: Wait for the resilver to complete.
  scan: resilver in progress since Thu Mar 26 22:04:50 2026
        407G / 9.68T scanned, 108G / 9.68T issued at 221M/s
        40.8G resilvered, 1.09% done, 12:36:19 to go
config:

        NAME                                   STATE     READ WRITE CKSUM
        bulk                                   ONLINE       0     0     0
          raidz1-0                             ONLINE       0     0     0
            sda                                ONLINE       0     0     3  (resilvering)
            ata-ST12000NM005G-2MT133_ZL28N553  ONLINE       0     0     0
            ata-ST12000NM005G-2MT133_ZLW1X3BT  ONLINE       0     0     0
        cache
          c1256568-01                          ONLINE       0     0     0

errors: No known data errors

  pool: striping
 state: ONLINE
  scan: scrub repaired 0B in 00:32:14 with 0 errors on Sun Mar  8 00:56:16 2026
config:

        NAME                                          STATE     READ WRITE CKSUM
        striping                                      ONLINE       0     0     0
          ata-INTEL_SSDSC2KB019T8_PHYF102500VU1P9DGN  ONLINE       0     0     0
          ata-INTEL_SSDSC2KB019T8_PHYF102500NN1P9DGN  ONLINE       0     0     0
        cache
          c1256568-02                                 ONLINE       0     0     0

errors: No known data errors
```

算是很不好的解决了这个问题吧。

> [!NOTE]
> zfs 的重建居然叫作 `resilvering`，看起来很艺术。
>
> 问了一下 GPT，给了我如下回答：这个术语来源于“修复镜子”的隐喻，因为镜像池（Mirroring）就像是在修复镜面的反射层。

## 最后的最后

我把以上的内容发送给了 GPT，GPT 认为可能是硬盘时序问题，因此我打算继续追查一下。

在使用如下命令后没有找到有用的记录，大概是已经找不到了。

```bash
journalctl -k | grep -Ei 'sda|sdc|ZL28ED42|ata|ahci|scsi|reset|I/O error|offline'
```

还好这次坏掉的 `zpool` 是 `RAIDZ1`，而且在例行检查的时候发现了问题，不然数据要丢哭了。
