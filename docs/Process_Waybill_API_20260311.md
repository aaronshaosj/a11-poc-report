# Process Waybill API 接口文档

> 提供人工运单数据的查询、枚举与基准指标计算。

---

## 基本信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://120.24.232.253:8018` |  dev环境下的CROS API地址
| 涉及接口 | 4 个（见下表） |

| # | 接口 | 方法 | 模式 | 说明 |
|---|------|------|------|------|
| 1 | `/vrp/list_batches` | GET | **同步** | 枚举用户可用的 batch_code |
| 2 | `/vrp/process_waybill` | POST | **异步** | 处理单个 batch_code |
| 3 | `/vrp/process_waybill_batch` | POST | **异步** | 批量处理多个 batch_code |
| 4 | `/vrp/session/status` | GET | **同步** | 轮询异步任务状态 |

---

## 接口一：枚举批次列表

```
GET /vrp/list_batches
```

**同步接口**，直接返回结果。

### 请求参数（Query String）

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `user_id` | int | 是 | — | 用户 ID（也接受 `userId`） |
| `group_id` | int | 否 | — | 接受但不用于查询（表中无此列） |
| `limit` | int | 否 | 50 | 每页条数，上限 200 |
| `offset` | int | 否 | 0 | 偏移量 |

### 请求示例

```
GET /vrp/list_batches?user_id=539&limit=5&offset=0
```

### 成功响应（HTTP 200）

```json
{
    "user_id": 539,
    "batches": [
        {
            "batch_code": "agent-batch1",
            "transport_date": "2026-01-08",
            "route_count": 36,
            "node_count": 261,
            "created_at": "2026-02-11T09:59:32.447601+08:00"
        },
        {
            "batch_code": "1031",
            "transport_date": null,
            "route_count": 40,
            "node_count": 297,
            "created_at": "2026-02-11T10:03:23.500213+08:00"
        }
    ],
    "total": 2,
    "limit": 5,
    "offset": 0
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `batches` | array | 批次列表，按 `transport_date` 降序排列 |
| `batches[].batch_code` | string | 批次号，可用于 `process_waybill` 调用 |
| `batches[].transport_date` | string \| null | 运输日期（`"YYYY-MM-DD"`），数据库未填则为 null |
| `batches[].route_count` | int | 该批次的运单/路线数 |
| `batches[].node_count` | int | 该批次的节点总数 |
| `batches[].created_at` | string \| null | 创建时间（ISO 8601） |
| `total` | int | 该用户的批次总数（用于分页） |
| `limit` | int | 当前每页条数 |
| `offset` | int | 当前偏移量 |

### 错误响应（HTTP 400）

```json
{
    "error": "bad_request",
    "detail": "缺少 user_id"
}
```

---

## 接口二：处理单个批次

```
POST /vrp/process_waybill
Content-Type: application/json
```

**异步接口**，提交后返回 `job_id`，通过接口四轮询获取结果。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `user_id` | int | 是 | 用户 ID（也接受 `userId`） |
| `group_id` | int | 是 | 组 ID（也接受 `groupId`） |
| `batch_code` | string | 是 | 批次号，对应仿真表中的 `batch_code` 字段 |
| `dept_id` | int | 否 | 部门 ID（也接受 `deptId`），默认等于 `group_id` |

### 请求示例

```json
{
    "user_id": 539,
    "group_id": 539,
    "batch_code": "1031"
}
```

### 提交响应（HTTP 202 Accepted）

```json
{
    "job_id": "fc1cb31d-ef01-4343-95c5-7bee34632c85",
    "status": "queued",
    "detail": "accepted",
    "created_at": 1773234417
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `job_id` | string (UUID) | 任务唯一标识，用于轮询 |
| `status` | string | 固定为 `"queued"` |
| `detail` | string | 固定为 `"accepted"` |
| `created_at` | int | Unix 时间戳（秒） |

### 成功结果（轮询 status == "succeeded"）

完整 `result` 结构见 [result 字段完整说明](#result-字段完整说明)。

### 错误响应（HTTP 400）

```json
{
    "error": "bad_request",
    "detail": "缺少 batch_code 或 waybill_file_path（至少提供一个）"
}
```

可能的 `detail` 值：
- `"payload 应为 JSON 对象"`
- `"缺少 batch_code 或 waybill_file_path（至少提供一个）"`
- `"缺少 user_id"`
- `"缺少 group_id"`

---

## 接口三：批量处理多个批次

```
POST /vrp/process_waybill_batch
Content-Type: application/json
```

**异步接口**，一次提交多个 `batch_code`，服务端逐个处理后汇总返回。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `user_id` | int | 是 | 用户 ID（也接受 `userId`） |
| `group_id` | int | 是 | 组 ID（也接受 `groupId`） |
| `batch_codes` | array\<string\> | 是 | 批次号数组，上限 30 个 |
| `dept_id` | int | 否 | 部门 ID，默认等于 `group_id` |

### 请求示例

```json
{
    "user_id": 539,
    "group_id": 539,
    "batch_codes": ["agent-batch1", "1031", "FAKE_BATCH"]
}
```

### 提交响应（HTTP 202 Accepted）

```json
{
    "job_id": "3482f49e-ae79-484f-9ce3-951e5059d8a3",
    "status": "queued",
    "detail": "accepted",
    "batch_count": 3,
    "created_at": 1773234424
}
```

### 成功结果（轮询 status == "succeeded"）

```json
{
    "status": "succeeded",
    "result": {
        "batches": {
            "agent-batch1": {
                "transport_date": null,
                "human_benchmark": { ... },
                "waybill_routes": { ... },
                "routes_detail": [ ... ],
                "batch_code": "agent-batch1",
                "metrics": { "duration_ms": 307 }
            },
            "1031": { ... }
        },
        "failed_batches": {
            "FAKE_BATCH": {
                "error": "未找到batch_code=FAKE_BATCH的人工运单数据"
            }
        },
        "summary": {
            "total": 3,
            "succeeded": 2,
            "failed": 1
        },
        "metrics": {
            "duration_ms": 8500
        }
    }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `result.batches` | object | 成功批次的结果，key 为 `batch_code`，value 结构与接口二的 `result` 完全一致 |
| `result.failed_batches` | object | 失败批次，key 为 `batch_code`，value 含 `error` 字段 |
| `result.summary.total` | int | 提交的 batch_code 总数 |
| `result.summary.succeeded` | int | 处理成功数 |
| `result.summary.failed` | int | 处理失败数 |
| `result.metrics.duration_ms` | int | 整个批量任务的总耗时（毫秒） |

### 错误响应（HTTP 400）

可能的 `detail` 值：
- `"payload 应为 JSON 对象"`
- `"缺少 user_id"`
- `"缺少 group_id"`
- `"缺少 batch_codes 数组"`
- `"batch_codes 数量不能超过 30"`

---

## 接口四：轮询任务状态

```
GET /vrp/session/status?job_id=<job_id>
```

用于轮询接口二、接口三的异步任务结果。

### 请求参数

| 参数 | 位置 | 必填 | 说明 |
|------|------|:----:|------|
| `job_id` | query string | 是 | 提交任务时返回的 `job_id` |

### 轮询策略建议

- 间隔：2~5 秒
- 超时上限：单个批次建议 60 秒；批量建议 600 秒
- 当 `status` 为 `"succeeded"` 或 `"failed"` 时停止轮询

### status 状态流转

```
queued → running → succeeded
                 → failed
```

| 状态 | 含义 | result 是否有值 |
|------|------|:--------------:|
| `queued` | 任务已入队 | 否（null） |
| `running` | 正在处理 | 否（null） |
| `succeeded` | 处理成功 | 是 |
| `failed` | 处理失败 | 是（含 `error`） |

### 响应 — 处理中

```json
{
    "job_id": "fc1cb31d-ef01-4343-95c5-7bee34632c85",
    "kind": "process_waybill",
    "status": "running",
    "result": null,
    "created_at": 1773234417,
    "updated_at": 1773234418
}
```

### 响应 — 失败

```json
{
    "job_id": "...",
    "kind": "process_waybill",
    "status": "failed",
    "result": {
        "error": "数据库模式失败: 未找到batch_code=ZT2601071002的人工运单数据"
    }
}
```

### 响应 — job_id 不存在（HTTP 404）

```json
{
    "error": "job not found",
    "job_id": "不存在的id"
}
```

---

## result 字段完整说明

以下是接口二成功时 `result` 的完整结构，接口三中每个成功批次的 value 结构与此一致。

### 完整示例

```json
{
    "transport_date": "2026-01-08",
    "batch_code": "1031",
    "human_benchmark": {
        "route_count": 40,
        "total_distance": 3849400.0,
        "total_time": 14619.3,
        "avg_volume_rate": 0.4113
    },
    "waybill_routes": {
        "shipments": [
            {
                "shipment_order_code": "Sys20251029200706598",
                "total_time": 130.7,
                "route_distance": 43000.0,
                "vehicle_type_name": "4.2厢车",
                "vehicle_type": null,
                "volume_rate": 0.0702,
                "volume": 1.0535,
                "weight": 0,
                "box": 11.0,
                "pallet": 0,
                "carrier_id": 574,
                "carrier_name": "虹迪-上海007",
                "node_list": [
                    {
                        "order_number": null,
                        "code": "SHCSC",
                        "name": "SHCSC",
                        "address": "上海市松山区城市开路222号",
                        "lng": 121.2720,
                        "lat": 31.0472,
                        "volume": 0,
                        "weight": 0,
                        "box": 0,
                        "pallet": 0,
                        "type": "dc"
                    },
                    {
                        "order_number": "888809641",
                        "code": "ST0097",
                        "name": "上海世纪联华",
                        "address": "上海市浦东新区金桥路2866号",
                        "lng": 121.5648,
                        "lat": 31.2770,
                        "volume": 0.567,
                        "weight": 0,
                        "box": 6,
                        "pallet": 0,
                        "type": "customer"
                    }
                ],
                "distances_between": []
            }
        ]
    },
    "routes_detail": [
        {
            "shipment_order_code": "Sys20251029200706598",
            "node_count": 3,
            "total_distance": 43000.0,
            "total_time": 130.7,
            "vehicle_type": "4.2厢车",
            "carrier_id": 574,
            "carrier_name": "虹迪-上海007",
            "transport_time": "2026-01-08T00:00:00+08:00"
        }
    ],
    "metrics": {
        "duration_ms": 86
    }
}
```

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `transport_date` | string \| null | 运输日期（`"YYYY-MM-DD"`），取自运单表 `transport_time`，未填则为 null |
| `batch_code` | string | 批次号回显 |
| `human_benchmark` | object | 人工基准汇总指标 |
| `waybill_routes` | object | 完整路线数据（含节点明细） |
| `routes_detail` | array | 各路线汇总指标 |
| `metrics` | object | 处理耗时 |

### human_benchmark — 人工基准汇总指标

| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| `route_count` | int | — | 路线总数 |
| `total_distance` | float | **米** | 所有路线里程总和 |
| `total_time` | float | — | 所有路线时长总和（数据库原值） |
| `avg_volume_rate` | float | 0~1 | 所有路线的平均装载率 |

> `total_distance` 单位为**米**，若需公里请除以 1000。

### waybill_routes — 完整路线数据

顶层结构 `{"shipments": [...]}`，每个元素为一条运单/路线。

#### shipment（运单/路线）

| 字段 | 类型 | 说明 |
|------|------|------|
| `shipment_order_code` | string | 运单号 |
| `total_time` | float | 该路线时长 |
| `route_distance` | float | 该路线里程（米） |
| `vehicle_type_name` | string | 车型名称（如 `"4.2厢车"`） |
| `vehicle_type` | int \| null | 车型编码（int），无值时为 null |
| `volume_rate` | float | 装载率（0~1） |
| `volume` | float | 总体积（m³） |
| `weight` | float | 总重量（kg） |
| `box` | float | 总件数 |
| `pallet` | int | 总板数 |
| `carrier_id` | int \| null | 承运商 ID |
| `carrier_name` | string \| null | 承运商名称 |
| `node_list` | array | 节点列表（第一个为 DC，其余为 customer） |
| `distances_between` | array\<float\> | 相邻节点间驾驶距离（米） |

#### node（节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| `order_number` | string \| null | 订单号。DC 节点为 null |
| `code` | string | 节点编码 |
| `name` | string | 节点名称 |
| `address` | string | 地址 |
| `lng` | float \| null | 经度 |
| `lat` | float \| null | 纬度 |
| `volume` | float | 体积（m³），DC 节点为 0 |
| `weight` | float | 重量（kg），DC 节点为 0 |
| `box` | int | 件数，DC 节点为 0 |
| `pallet` | int | 板数，DC 节点为 0 |
| `type` | string | `"dc"` = 配送中心，`"customer"` = 客户 |

**node_list 排列规则**：
- 第 0 个节点固定为 **DC**（`type: "dc"`），即该路线的出发仓库
- 第 1~N 个节点为 **customer**（`type: "customer"`），按 `node_sort_id` 升序排列

### routes_detail — 各路线汇总指标

数组，每个元素对应一条路线：

| 字段 | 类型 | 说明 |
|------|------|------|
| `shipment_order_code` | string | 运单号 |
| `node_count` | int | 节点数（含 DC） |
| `total_distance` | float | 该路线总里程（米） |
| `total_time` | float | 该路线总时长 |
| `vehicle_type` | string | 车型名称 |
| `carrier_id` | int \| null | 承运商 ID |
| `carrier_name` | string \| null | 承运商名称 |
| `transport_time` | string \| null | 运输时间（ISO 8601 格式，如 `"2026-01-08T00:00:00+08:00"`），未填则为 null |

### metrics — 处理耗时

| 字段 | 类型 | 说明 |
|------|------|------|
| `duration_ms` | int | 服务端处理耗时（毫秒） |

---

## 数据来源

数据库模式从 PostgreSQL 的两张仿真表查询数据：

### 表 td_m_simulation_shipment — 运单主数据

查询条件：`WHERE user_id = ? AND batch_code = ?`

| 数据库列名 | 映射到响应字段 |
|-----------|---------------|
| `shipment_number` | `shipment_order_code` |
| `vehicle_type_name` | `vehicle_type_name` / `routes_detail[].vehicle_type` |
| `vehicle_type` | `shipment.vehicle_type`（int 编码） |
| `carrier_id` | `carrier_id` |
| `carrier_name` | `carrier_name` |
| `transport_time` | `transport_date`（取日期部分）/ `routes_detail[].transport_time`（ISO 格式） |
| `total_box_count` | `shipment.box` |
| `total_weight` | `shipment.weight` |
| `total_volume` | `shipment.volume` |
| `total_pallet_count` | `shipment.pallet` |
| `route_distance`（**km**） | 转为**米** → `route_distance` / `total_distance` |
| `total_time` | `total_time` |
| `volume_rate` | `volume_rate` / `avg_volume_rate` |

### 表 td_m_simulation_node — 节点明细

查询条件：`WHERE user_id = ? AND batch_code = ?`，按 `shipment_number ASC, node_sort_id ASC` 排序。

| 数据库列名 | 映射到响应字段 |
|-----------|---------------|
| `shipment_number` | 分组依据 |
| `order_number` | `node.order_number` |
| `code` | `node.code` |
| `name` | `node.name` |
| `type` | `node.type`（`dc` / `customer`） |
| `box_count` | `node.box` |
| `pallet_count` | `node.pallet` |
| `weight` | `node.weight` |
| `volume` | `node.volume` |
| `longitude` | `node.lng` |
| `latitude` | `node.lat` |
| `address` | `node.address` |
| `node_sort_id` | 决定 `node_list` 中的排列顺序 |

---

## 调用示例

### Python — 完整流程（发现 → 单个查询 → 批量查询）

```python
import requests
import time

BASE_URL = "http://120.24.232.253:8018"

# ========== 1. 发现可用批次 ==========
resp = requests.get(f"{BASE_URL}/vrp/list_batches", params={
    "user_id": 539,
    "limit": 10
})
batches = resp.json()["batches"]
print(f"共 {resp.json()['total']} 个批次:")
for b in batches:
    print(f"  {b['batch_code']}: {b['route_count']}条路线, 日期={b['transport_date']}")


# ========== 2. 处理单个批次 ==========
def poll_job(job_id, timeout=60):
    """轮询等待任务完成"""
    for _ in range(timeout // 3):
        time.sleep(3)
        data = requests.get(f"{BASE_URL}/vrp/session/status",
                            params={"job_id": job_id}).json()
        if data["status"] == "succeeded":
            return data["result"]
        if data["status"] == "failed":
            raise Exception(f"失败: {data['result'].get('error')}")
    raise TimeoutError(f"{timeout}秒超时")

resp = requests.post(f"{BASE_URL}/vrp/process_waybill", json={
    "user_id": 539,
    "group_id": 539,
    "batch_code": batches[0]["batch_code"]
})
result = poll_job(resp.json()["job_id"])

hb = result["human_benchmark"]
print(f"\n路线数: {hb['route_count']}, 总里程: {hb['total_distance']/1000:.1f}km")

for rd in result["routes_detail"]:
    print(f"  {rd['shipment_order_code']}: "
          f"{rd['node_count']}节点, {rd['total_distance']/1000:.1f}km, "
          f"承运商={rd['carrier_name']}")


# ========== 3. 批量处理（多天数据） ==========
batch_codes = [b["batch_code"] for b in batches[:5]]
resp = requests.post(f"{BASE_URL}/vrp/process_waybill_batch", json={
    "user_id": 539,
    "group_id": 539,
    "batch_codes": batch_codes
})
result = poll_job(resp.json()["job_id"], timeout=300)

print(f"\n批量结果: {result['summary']}")
for bc, data in result["batches"].items():
    print(f"  {bc}: {data['human_benchmark']['route_count']}条路线")
for bc, err in result["failed_batches"].items():
    print(f"  {bc}: 失败 - {err['error']}")
```

### cURL

```bash
# 1. 枚举批次
curl "http://120.24.232.253:8018/vrp/list_batches?user_id=539&limit=5"

# 2. 处理单个批次
curl -X POST http://120.24.232.253:8018/vrp/process_waybill \
  -H "Content-Type: application/json" \
  -d '{"user_id": 539, "group_id": 539, "batch_code": "1031"}'
# → 返回 job_id，然后轮询：
curl "http://120.24.232.253:8018/vrp/session/status?job_id=<job_id>"

# 3. 批量处理
curl -X POST http://120.24.232.253:8018/vrp/process_waybill_batch \
  -H "Content-Type: application/json" \
  -d '{"user_id": 539, "group_id": 539, "batch_codes": ["agent-batch1", "1031"]}'
# → 返回 job_id，然后轮询同上
```

---

## 常见错误场景

| 场景 | HTTP 状态码 | 表现 |
|------|:-----------:|------|
| 缺少必填参数 | 400 | `{"error": "bad_request", "detail": "缺少 user_id"}` |
| 请求体非 JSON | 400 | `{"error": "bad_request", "detail": "payload 应为 JSON 对象"}` |
| batch_codes 为空数组 | 400 | `{"error": "bad_request", "detail": "缺少 batch_codes 数组"}` |
| batch_codes 超过上限 | 400 | `{"error": "bad_request", "detail": "batch_codes 数量不能超过 30"}` |
| job_id 不存在 | 404 | `{"error": "job not found", "job_id": "..."}` |
| batch_code 不存在 | 轮询 200 | `status: "failed"`, `error: "未找到batch_code=...的人工运单数据"` |
| user_id 与 batch_code 不匹配 | 轮询 200 | 同上（查询结果为空） |
| 数据库连接失败 | 轮询 200 | `status: "failed"`, `error` 中包含 PostgreSQL 连接错误 |

---

## 单位速查

| 数据项 | 单位 | 备注 |
|--------|------|------|
| `total_distance`（human_benchmark） | 米 | 所有路线里程之和 |
| `total_distance`（routes_detail） | 米 | 单条路线里程 |
| `route_distance`（shipment） | 米 | 单条路线里程 |
| `distances_between` | 米 | 相邻节点间距离 |
| `volume` | m³ | — |
| `weight` | kg | — |
| `box` | 件 | — |
| `pallet` | 板 | — |
| `avg_volume_rate` / `volume_rate` | 0~1 | 如 0.82 表示 82% |
| `lng` / `lat` | 度 | — |
| `duration_ms` | 毫秒 | 服务端处理耗时 |
| `created_at` / `updated_at` | Unix 秒 | 任务时间戳 |
