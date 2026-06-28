#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取并解析四库全书完整数据
"""

import re
import json
import requests

def fetch_page(url):
    """获取网页内容"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    response = requests.get(url, headers=headers, timeout=30)
    response.encoding = 'utf-8'
    return response.text

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

def transform_record(record):
    """转换记录格式"""
    authors = extract_authors(record['author'])
    volumes_info = extract_volumes_info(record['volumes'])
    category = extract_category(record['volumes'])
    
    # 提取书名和总卷数
    title = record['fullTitle']
    total_volumes = 0
    
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
    
    return {
        'id': record['id'],
        'title': book_name,
        'fullTitle': record['fullTitle'],
        'authors': authors,
        'volumes': volumes_info,
        'totalVolumes': total_volumes,
        'category': category,
        'series': '景印文渊阁四库全书',
        'type': 'ancient',
        'subType': 'collection',
        'version': '影印本',
        'publisher': '台湾商务印书馆',
        'publishYear': '1983-1986',
        'notes': record.get('notes', '')
    }

def main():
    url = 'http://csid.zju.edu.cn/doclib/sub?id=8a8fbda74ca27288014ca2735ac4017b&type=1'
    
    print('正在爬取数据...')
    html = fetch_page(url)
    print(f'获取到 {len(html)} 字节')
    
    print('正在解析表格...')
    records = parse_table(html)
    print(f'解析到 {len(records)} 条记录')
    
    print('正在转换格式...')
    transformed = [transform_record(r) for r in records]
    
    # 保存JSON
    output_file = 'lib/siku-quanshu.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(transformed, f, ensure_ascii=False, indent=2)
    
    print(f'已保存到 {output_file}')
    
    # 同时保存到 public 目录供前端使用
    public_file = 'public/ancient-books.json'
    with open(public_file, 'w', encoding='utf-8') as f:
        json.dump(transformed, f, ensure_ascii=False, indent=2)
    
    print(f'已保存到 {public_file}')
    
    # 统计
    categories = {}
    for r in transformed:
        cat = r['category'] or '未分类'
        categories[cat] = categories.get(cat, 0) + 1
    
    print('\n各部统计：')
    for cat, count in sorted(categories.items()):
        print(f'  {cat}: {count} 种')

if __name__ == '__main__':
    main()
