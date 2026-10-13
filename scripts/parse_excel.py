import openpyxl
import json
import re

wb = openpyxl.load_workbook('biblequiz-main/BQA_Bible_Quiz_Automation_Blueprint.xlsx', data_only=True)
sheet = wb['Sample_Users_350']

members = []
seen_phones = set()

for row in sheet.iter_rows(min_row=2, values_only=True):
    name = row[1]
    phone = row[2]
    church = row[3]
    city = row[4]
    
    if not phone:
        continue
        
    phone_clean = re.sub(r'[^0-9]', '', str(phone))
    if len(phone_clean) == 10:
        phone_clean = '91' + phone_clean
    elif len(phone_clean) == 12 and phone_clean.startswith('91'):
        pass
    else:
        continue
        
    if phone_clean in seen_phones:
        continue
    seen_phones.add(phone_clean)
    
    members.append({
        'name': str(name).strip() if name else 'CY Member',
        'phone': phone_clean,
        'church': str(church).strip() if church else 'St. Chavara Church / CY',
        'city': str(city).strip() if city else 'Central Campus',
        'status': 'active',
        'language': 'en'
    })

print(f"Extracted {len(members)} unique valid Indian phone numbers.")

with open('scripts/extracted_members.json', 'w', encoding='utf-8') as f:
    json.dump(members, f, indent=2, ensure_ascii=False)
