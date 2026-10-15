import csv
import os
import re
import time
from collections import defaultdict

def extract_category_names(mesh_file):
    """Extract a mapping of Level 2 category codes to their names."""
    category_name_map = {}
    with open(mesh_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row['Level2Categories'] or not row['Level2Names']:
                continue
            categories = [cat.strip() for cat in row['Level2Categories'].split(';')]
            names = [name.strip() for name in row['Level2Names'].split(';')]
            for i, cat in enumerate(categories):
                if i < len(names):
                    if cat not in category_name_map or len(categories) == 1:
                        category_name_map[cat] = names[i]
    return category_name_map

def load_mesh_terms(mesh_file):
    """Load MeSH terms and their categories."""
    term_to_categories = {}
    with open(mesh_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            term_to_categories[row['Name']] = {
                'categories': [cat.strip() for cat in row['Level2Categories'].split(';')] if row['Level2Categories'] else [],
                'ui': row['UI']
            }
    return term_to_categories

def load_count_results(results_file):
    """Load the count results from Step 3."""
    results = []
    with open(results_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append({
                'UI': row['UI'],
                'Name': row['Name'],
                'Count': int(row['Count']) if row['Count'].isdigit() else 0,
                'PriorYearCount': int(row['PriorYearCount']) if 'PriorYearCount' in row and row['PriorYearCount'].isdigit() else None
            })
    return results

def generate_level2_summary(mesh_file, results_file, summary_output, detailed_output):
    """Generate the high-level summary and detailed term-by-term breakdown."""
    category_name_map = extract_category_names(mesh_file)
    term_to_categories = load_mesh_terms(mesh_file)
    count_results = load_count_results(results_file)
    
    level2_stats = defaultdict(lambda: {'total_count': 0, 'total_prior_year_count': 0, 'term_entries': []})
    term_to_all_categories = defaultdict(set)

    # Aggregate counts
    for result in count_results:
        term_name = result['Name']
        if term_name not in term_to_categories: continue
        
        categories = term_to_categories[term_name]['categories']
        num_cats = len(categories)
        
        for cat in categories:
            term_to_all_categories[term_name].add(cat)
            level2_stats[cat]['total_count'] += result['Count']
            if result['PriorYearCount'] is not None:
                level2_stats[cat]['total_prior_year_count'] += result['PriorYearCount']
            
            # Store data for the detailed file
            level2_stats[cat]['term_entries'].append({
                'CategoryCode': cat,
                'CategoryName': category_name_map.get(cat, f"Unknown {cat}"),
                'UI': result['UI'],
                'TermName': term_name,
                'Count': result['Count'],
                'PriorYearCount': result['PriorYearCount'] if result['PriorYearCount'] is not None else '',
                'NumCategories': num_cats
            })

    # Write Summary File
    summary_data = []
    for cat, stats in level2_stats.items():
        summary_data.append({
            'CategoryCode': cat,
            'CategoryName': category_name_map.get(cat, f"Unknown {cat}"),
            'TotalCount': stats['total_count'],
            'PriorYearTotalCount': stats['total_prior_year_count'],
            'UniqueTerms': len(stats['term_entries'])
        })
    
    with open(summary_output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['CategoryCode', 'CategoryName', 'TotalCount', 'PriorYearTotalCount', 'UniqueTerms'])
        writer.writeheader()
        writer.writerows(sorted(summary_data, key=lambda x: x['TotalCount'], reverse=True))

    # Write Detailed File
    with open(detailed_output, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['CategoryCode', 'CategoryName', 'UI', 'TermName', 'Count', 'PriorYearCount', 'NumCategories']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by Category Code, then by individual term Count descending
        all_details = []
        for cat in sorted(level2_stats.keys()):
            cat_terms = sorted(level2_stats[cat]['term_entries'], key=lambda x: x['Count'], reverse=True)
            all_details.extend(cat_terms)
        writer.writerows(all_details)
        
    return {'total_categories': len(summary_data), 'total_terms_processed': len(count_results)}

def main():
    print("\n" + "="*60)
    print("MeSH Level 2 Category Summary Generator (Automated)")
    print("="*60 + "\n")
    
    try:
        dir_path = os.getcwd() 
        mesh_filename = input("Enter the MeSH descriptor CSV filename (e.g., desc2026.csv): ").strip()
        mesh_file_path = os.path.join(dir_path, mesh_filename)
        
        if not os.path.isfile(mesh_file_path):
            print(f"Error: File '{mesh_filename}' not found.")
        else:
            results_filename = "mesh_counts.csv"
            results_file_path = os.path.join(dir_path, results_filename)
            
            if not os.path.isfile(results_file_path):
                print(f"Error: '{results_filename}' not found.")
            else:
                year_match = re.search(r'(\d{4})', mesh_filename)
                year_str = year_match.group(1) if year_match else "Updated"
                
                sum_out = os.path.join(dir_path, f"MeSH_{year_str}_Level2_Summary.csv")
                det_out = os.path.join(dir_path, f"MeSH_{year_str}_Level2_Summary_Detailed.csv")
                
                print(f"[*] Processing: {mesh_filename} & {results_filename}")
                stats = generate_level2_summary(mesh_file_path, results_file_path, sum_out, det_out)
                
                print(f"\nSUCCESS: Created two files:")
                print(f" 1. {os.path.basename(sum_out)}")
                print(f" 2. {os.path.basename(det_out)}")
                print(f"\nCategories Found: {stats['total_categories']}")

    except Exception as e:
        print(f"\nAN ERROR OCCURRED: {e}")
    
    print(f"\nScript finished. This window will close in 20 seconds...")
    time.sleep(20)

if __name__ == "__main__":
    main()