import re
from pathlib import Path

def patch_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        def button_replacer(match):
            btn_tag = match.group(0)
            if 'cursor-pointer' not in btn_tag:
                if 'className="' in btn_tag:
                    btn_tag = re.sub(r'className="([^"]*)"', r'className="\1 cursor-pointer"', btn_tag)
                else:
                    btn_tag = btn_tag.replace('<button', '<button className="cursor-pointer"')
            return btn_tag
            
        # Only replace inside <button ...>
        final_content = re.sub(r'<button\b[^>]*>', button_replacer, content)
        
        if final_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(final_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error on {filepath}: {e}")

src_dir = 'c:/Users/serda/Code/LLM Policy Validator/afstudeerproject-pgm-serdkara/frontend/src'
for filepath in Path(src_dir).rglob("*.tsx"):
    patch_file(filepath)
