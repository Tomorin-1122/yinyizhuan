#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取多个古籍丛书数据
"""

import re
import json
import requests
import time

# 丛书配置
SERIES_CONFIG = {
    'xuxu-siku': {
        'name': '续修四库全书',
        'url': 'http://csid.zju.edu.cn/doclib/sub?id=8a8fbda74ca27288014ca2735b540180&type=1',
        'publisher': '上海古籍出版社',
        'publishPlace': '上海',
        'publishYear': '2002'
    },
    'tianyi-fangzhi': {
        'name': '天一阁藏明代方志选刊',
        'url': 'http://csid.zju.edu.cn/doclib/sub?id=8a8fbda74ca27288014ca2735dd70196&type=1',
        'publisher': '上海书店',
        'publishPlace': '上海',
        'publishYear': '1982'
    },
    'tianyi-fangzhi-xubian': {
        'name': '天一阁藏明代方志选刊续编',
        'url': 'http://csid.zju.edu.cn/doclib/sub?id=8a8fbda74ca27288014ca2735df30197&type=1',
        'publisher': '上海书店',
        'publishPlace': '上海',
        'publishYear': '1990'
    },
    'zhongguo-fangzhi': {
        'name': '中国方志丛书',
        'url': 'http://csid.zju.edu.cn/doclib/sub?id=8a8fbda74ca27288014ca2735d430191&type=1',
        'publisher': '成文出版社',
        'publishPlace': '台北',
        'publishYear': '1985'
    }
}

def fetch_page(url):
    """获取网页内容"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        return response.text
    except Exception as e:
        print(f'获取失败: {e}')
        return None

def parse_table(html):
    """解析HTML表格"""
    records = []
    
    # 匹配表格行
    row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
    cell_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
    
    rows = row_pattern.findall(html)
    
    for row in rows:
        cells = cell_pattern.findall(row)
        if len(cells) >= 5:
            # 清理HTML标签
            def clean(text):
                return re.sub(r'<[^>]+>', '', text).strip()
            
            seq_text = clean(cells[0])
            if seq_text.isdigit():
                record = {
                    'id': int(seq_text),
                    'fullTitle': clean(cells[1]),
                    'author': clean(cells[2]),
                    'version': clean(cells[3]),
                    'volumes': clean(cells[4]),
                    'notes': clean(cells[5]) if len(cells) > 5 else ''
                }
                records.append(record)
    
    return records

def chinese_to_arabic(chinese_str):
    """中文数字转阿拉伯数字"""
    chinese_nums = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '百': 100, '千': 1000
    }
    
    result = 0
    temp = 0
    
    for char in chinese_str:
        if char in chinese_nums:
            num = chinese_nums[char]
            if num >= 10:
                if temp == 0:
                    temp = 1
                result += temp * num
                temp = 0
            else:
                temp = num
    
    result += temp
    return result if result > 0 else 0

def extract_authors(author_str):
    """解析责任者"""
    authors = []
    parts = re.split(r'[，、]', author_str)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        match = re.match(r'\((.+?)\)(.+?)(?:撰|编|辑|注|疏|述|纂|修|著)', part)
        if match:
            dynasty = match.group(1)
            name = match.group(2).strip()
            role = re.search(r'(撰|编|辑|注|疏|述|纂|修|著)', part)
            role = role.group(1) if role else '撰'
            authors.append({
                'name': name,
                'dynasty': dynasty,
                'role': role
            })
    
    return authors

def extract_volumes_info(volumes_str):
    """提取册数信息"""
    match = re.search(r'第(\d+)(?:-(\d+))?册', volumes_str)
    if match:
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else start
        return {
            'start': start,
            'end': end,
            'count': end - start + 1,
            'raw': volumes_str
        }
    return {'raw': volumes_str}

def extract_category(volumes_str):
    """提取部类"""
    match = re.search(r'（(经|史|子|集)部）', volumes_str)
    if match:
        return match.group(1)
    return None

def extract_era(title, version=''):
    """从书名或版本中提取年号"""
    # 优先从书名中提取
    era_pattern = r'^(嘉靖|万历|正德|弘治|隆庆|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统|民国|永乐|洪武|天顺|成化|崇祯|顺治|景泰|天启)'
    match = re.search(era_pattern, title)
    if match:
        return match.group(1)
    
    # 从版本中提取（如"民国年间抄本"、"清光绪二十一年刊本"、"明嘉靖二十九年刊本"）
    if version:
        # 匹配"民国"或"清"+"年号"或"明"+"年号"模式
        version_era_match = re.search(r'(民国|清(光绪|宣统|同治|咸丰|道光|嘉庆|乾隆|雍正|康熙)|明(嘉靖|万历|正德|弘治|隆庆|天启|崇祯))', version)
        if version_era_match:
            era = version_era_match.group(1)
            # 如果是"清+年号"或"明+年号"模式，只返回年号部分
            if era.startswith('清') or era.startswith('明'):
                return era[1:]
            return era
    
    return None

def extract_number_from_volumes(volumes_str):
    """从册数提取编号"""
    # 匹配 [华中·江西]第0789册 格式
    match = re.search(r'\[([^\]]+)\]第(\d+)册', volumes_str)
    if match:
        region = match.group(1).replace('&middot;', '·')
        number = match.group(2)
        return f'{region}地方第{number.lstrip("0")}号'
    return None

def transform_record(record, config):
    """转换记录格式"""
    authors = extract_authors(record['author'])
    volumes_info = extract_volumes_info(record['volumes'])
    category = extract_category(record['volumes'])
    
    # 提取书名和总卷数
    title = record['fullTitle']
    total_volumes = 0
    province = None
    era = None
    number = None
    
    # 方志丛书特殊处理：提取省份信息
    if config['name'] in ['天一阁藏明代方志选刊', '天一阁藏明代方志选刊续编']:
        # 匹配"（省份）"格式
        province_match = re.search(r'[（(]([^）)]+)[）)]', title)
        if province_match:
            province = province_match.group(1)
            # 从书名中移除省份信息
            title = re.sub(r'[（(][^）)]+[）)]', '', title).strip()
    
    # 中国方志丛书特殊处理：从册数中提取地区信息和编号
    if config['name'] == '中国方志丛书':
        # 匹配"[华中·安徽]"格式
        region_match = re.search(r'\[([^\]]+)\]', record['volumes'])
        if region_match:
            province = region_match.group(1).replace('&middot;', '·')
        # 提取编号
        number = extract_number_from_volumes(record['volumes'])
    
    # 提取年号（优先从书名，其次从版本）
    era = extract_era(title, record.get('version', ''))
    
    volume_match = re.search(r'^(.+?)([一二三四五六七八九十百千]+)卷', title)
    if volume_match:
        book_name = volume_match.group(1).strip()
        volume_str = volume_match.group(2)
        total_volumes = chinese_to_arabic(volume_str)
    else:
        volume_match2 = re.search(r'^(.+?)(一)卷', title)
        if volume_match2:
            book_name = volume_match2.group(1).strip()
            total_volumes = 1
        else:
            book_name = title
    
    result = {
        'id': record['id'],
        'title': book_name,
        'fullTitle': record['fullTitle'],
        'authors': authors,
        'volumes': volumes_info,
        'totalVolumes': total_volumes,
        'category': category,
        'series': config['name'],
        'type': 'ancient',
        'subType': 'collection',
        'version': record.get('version', ''),
        'publisher': config['publisher'],
        'publishPlace': config['publishPlace'],
        'publishYear': config['publishYear'],
        'notes': record.get('notes', '')
    }
    
    # 添加方志相关字段
    if era:
        result['era'] = era
    if province:
        result['province'] = province
    if number:
        result['number'] = number
    
    return result

def fetch_series(series_id, config):
    """爬取单个丛书"""
    print(f"\n正在爬取: {config['name']}")
    print(f"URL: {config['url']}")
    
    html = fetch_page(config['url'])
    if not html:
        return []
    
    print(f"获取到 {len(html)} 字节")
    
    records = parse_table(html)
    print(f"解析到 {len(records)} 条记录")
    
    transformed = [transform_record(r, config) for r in records]
    return transformed

def deduplicate_records(records):
    """去除重复记录（繁简体两个版本）"""
    seen = set()
    unique_records = []
    
    for record in records:
        # 使用书名+册数作为唯一标识
        key = f"{record['title']}_{record['volumes'].get('raw', '')}"
        
        # 简化key，去除空格和特殊字符
        key = re.sub(r'\s+', '', key)
        
        if key not in seen:
            seen.add(key)
            unique_records.append(record)
    
    return unique_records

def main():
    all_records = []
    series_stats = {}
    
    for series_id, config in SERIES_CONFIG.items():
        records = fetch_series(series_id, config)
        
        # 去重
        original_count = len(records)
        records = deduplicate_records(records)
        deduplicated_count = original_count - len(records)
        
        if deduplicated_count > 0:
            print(f"去重: {original_count} -> {len(records)} (去除 {deduplicated_count} 条重复)")
        
        all_records.extend(records)
        series_stats[config['name']] = len(records)
        
        # 保存单个丛书数据
        output_file = f'lib/{series_id}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"已保存到 {output_file}")
        
        # 间隔1秒，避免请求过快
        time.sleep(1)
    
    # 合并所有数据
    combined_file = 'lib/ancient-books-all.json'
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"\n已保存合并数据到 {combined_file}")
    
    # 同时更新 public 目录供前端使用
    public_file = 'public/ancient-books.json'
    with open(public_file, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"已保存到 {public_file}")
    
    # 统计
    print("\n" + "="*50)
    print("爬取统计：")
    for name, count in series_stats.items():
        print(f"  {name}: {count} 条")
    print(f"  总计: {len(all_records)} 条")
    print("="*50)

if __name__ == '__main__':
    main()
