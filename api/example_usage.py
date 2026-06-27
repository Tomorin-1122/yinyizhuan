#!/usr/bin/env python3
"""
引易转 API 使用示例
展示如何在实际项目中调用API
"""

import requests
import json
from typing import List, Dict, Optional

class YinyizhuanAPI:
    """引易转 API 客户端"""
    
    def __init__(self, base_url: str = "https://yinyizhuan.vercel.app"):
        """
        初始化API客户端
        
        Args:
            base_url: API基础URL
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json"
        })
    
    def convert(self, text: str, format: str = "lsyj") -> Dict:
        """
        转换单个引用
        
        Args:
            text: 引用文本
            format: 目标格式 (lsyj, gbt7714, apa)
            
        Returns:
            转换结果字典
        """
        response = self.session.post(
            f"{self.base_url}/api/convert",
            json={"text": text, "format": format}
        )
        response.raise_for_status()
        return response.json()
    
    def batch_convert(self, items: List[Dict[str, str]]) -> Dict:
        """
        批量转换引用
        
        Args:
            items: 引用列表，每项包含text和可选的format
            
        Returns:
            批量转换结果
        """
        response = self.session.post(
            f"{self.base_url}/api/batch-convert",
            json={"items": items}
        )
        response.raise_for_status()
        return response.json()
    
    def parse(self, text: str) -> Dict:
        """
        智能解析引用（不格式化）
        
        Args:
            text: 引用文本
            
        Returns:
            解析结果
        """
        response = self.session.post(
            f"{self.base_url}/api/parse",
            json={"text": text}
        )
        response.raise_for_status()
        return response.json()
    
    def get_formats(self) -> Dict:
        """
        获取支持的格式
        
        Returns:
            格式列表
        """
        response = self.session.get(f"{self.base_url}/api/formats")
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict:
        """
        健康检查
        
        Returns:
            健康状态
        """
        response = self.session.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()


def example_single_conversion():
    """示例：单个引用转换"""
    print("📝 示例1：单个引用转换")
    print("-" * 40)
    
    api = YinyizhuanAPI()
    
    # 转换为GB/T 7714格式
    result = api.convert(
        "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        format="gbt7714"
    )
    
    print(f"输入: {result['data']['original']}")
    print(f"输出: {result['data']['result']}")
    print(f"格式: {result['data']['format']}")
    print()


def example_batch_conversion():
    """示例：批量引用转换"""
    print("📚 示例2：批量引用转换")
    print("-" * 40)
    
    api = YinyizhuanAPI()
    
    # 准备批量数据
    items = [
        {
            "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
            "format": "lsyj"
        },
        {
            "text": "张三：《测试著作》，北京：人民出版社，2020年。",
            "format": "gbt7714"
        },
        {
            "text": "李四：《学术论文》，《期刊名称》2021年第5期。",
            "format": "apa"
        }
    ]
    
    result = api.batch_convert(items)
    
    print(f"总数: {result['data']['total']}")
    print(f"成功: {result['data']['successful']}")
    print(f"失败: {result['data']['failed']}")
    print()
    
    for item in result['data']['results']:
        if item['success']:
            print(f"[{item['index']}] {item['result']}")
        else:
            print(f"[{item['index']}] 错误: {item['error']}")
    print()


def example_parse_only():
    """示例：仅解析（不格式化）"""
    print("🔍 示例3：智能解析")
    print("-" * 40)
    
    api = YinyizhuanAPI()
    
    result = api.parse(
        "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。"
    )
    
    citation = result['data']['citation']
    print(f"类型: {citation['type']}")
    print(f"语言: {citation['language']}")
    print(f"标题: {citation['title']}")
    print(f"作者: {', '.join([a['name'] for a in citation['authors']])}")
    print(f"期刊: {citation.get('journalName', 'N/A')}")
    print(f"年份: {citation.get('publishYear', 'N/A')}")
    print()


def example_format_detection():
    """示例：格式检测"""
    print("🎯 示例4：格式检测")
    print("-" * 40)
    
    api = YinyizhuanAPI()
    
    # 测试不同格式
    test_cases = [
        "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        "张三. 测试著作[M]. 北京: 人民出版社, 2020.",
        "Li, S. (2021). Test Article. Journal Name, 5(2), 123-145."
    ]
    
    for text in test_cases:
        result = api.parse(text)
        citation = result['data']['citation']
        print(f"文本: {text[:30]}...")
        print(f"  类型: {citation['type']}")
        print(f"  语言: {citation['language']}")
        print()


def example_error_handling():
    """示例：错误处理"""
    print("⚠️ 示例5：错误处理")
    print("-" * 40)
    
    api = YinyizhuanAPI()
    
    # 测试无效输入
    try:
        result = api.convert("", "gbt7714")
    except requests.exceptions.HTTPError as e:
        print(f"HTTP错误: {e.response.status_code}")
        print(f"错误信息: {e.response.json()['message']}")
    
    # 测试无效格式
    try:
        result = api.convert("测试文本", "invalid_format")
    except requests.exceptions.HTTPError as e:
        print(f"HTTP错误: {e.response.status_code}")
        print(f"错误信息: {e.response.json()['message']}")
    print()


def main():
    """主函数"""
    print("🚀 引易转 API 使用示例")
    print("=" * 50)
    print()
    
    try:
        example_single_conversion()
        example_batch_conversion()
        example_parse_only()
        example_format_detection()
        example_error_handling()
        
        print("✅ 所有示例执行完成！")
        
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
