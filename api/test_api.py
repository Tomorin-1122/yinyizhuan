#!/usr/bin/env python3
"""
引易转 API 测试脚本
用于测试API端点是否正常工作
"""

import requests
import json
import sys

BASE_URL = "http://localhost:3000"  # 本地测试
# BASE_URL = "https://yinyizhuan.vercel.app"  # 生产环境

def test_health():
    """测试健康检查"""
    print("1. 测试健康检查...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 状态: {data['data']['status']}")
        print(f"   版本: {data['data']['version']}")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

def test_formats():
    """测试获取格式"""
    print("\n2. 测试获取格式...")
    try:
        response = requests.get(f"{BASE_URL}/api/formats")
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 支持格式: {len(data['data']['formats'])} 个")
        for fmt in data['data']['formats']:
            print(f"      - {fmt['id']}: {fmt['name']}")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

def test_convert():
    """测试单个转换"""
    print("\n3. 测试单个转换...")
    try:
        test_text = "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。"
        response = requests.post(
            f"{BASE_URL}/api/convert",
            json={"text": test_text, "format": "gbt7714"},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 转换成功")
        print(f"   输入: {data['data']['original'][:50]}...")
        print(f"   输出: {data['data']['result'][:50]}...")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

def test_parse():
    """测试智能解析"""
    print("\n4. 测试智能解析...")
    try:
        test_text = "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。"
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"text": test_text},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 解析成功")
        print(f"   类型: {data['data']['citation']['type']}")
        print(f"   语言: {data['data']['citation']['language']}")
        print(f"   标题: {data['data']['citation']['title']}")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

def test_batch_convert():
    """测试批量转换"""
    print("\n5. 测试批量转换...")
    try:
        items = [
            {"text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。", "format": "lsyj"},
            {"text": "张三：《测试著作》，北京：人民出版社，2020年。", "format": "gbt7714"}
        ]
        response = requests.post(
            f"{BASE_URL}/api/batch-convert",
            json={"items": items},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 批量转换成功")
        print(f"   总数: {data['data']['total']}")
        print(f"   成功: {data['data']['successful']}")
        print(f"   失败: {data['data']['failed']}")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🧪 引易转 API 测试")
    print("=" * 50)
    
    results = []
    results.append(test_health())
    results.append(test_formats())
    results.append(test_convert())
    results.append(test_parse())
    results.append(test_batch_convert())
    
    print("\n" + "=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("✅ 所有测试通过！")
        return 0
    else:
        print("❌ 部分测试失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
