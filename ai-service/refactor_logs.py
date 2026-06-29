import os
import re

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if no print statements (except maybe in comments, but quick check)
    if 'print(' not in content:
        return

    # Add logger import if not present
    if 'import logging' not in content:
        # Find first import or top of file
        lines = content.split('\n')
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                insert_idx = i
                break
        
        logger_code = "import logging\nlogger = logging.getLogger(__name__)\n"
        lines.insert(insert_idx, logger_code)
        content = '\n'.join(lines)

    # Replace print( with logger.info(
    # This is a naive regex that catches most standard print calls
    # but ignores prints that are commented out
    
    # We will use a regex to replace print( with logger.info(
    # but we must be careful not to replace things like some_func_print(
    new_content = re.sub(r'(?<!\w)print\(', 'logger.info(', content)
    
    # Also replace silent exceptions
    new_content = re.sub(r'except Exception:\s*\n\s*pass', r'except Exception as e:\n            logger.error(f"Silent error swallowed: {e}", exc_info=True)', new_content)
    new_content = re.sub(r'except Exception as e:\s*\n\s*pass', r'except Exception as e:\n            logger.error(f"Silent error swallowed: {e}", exc_info=True)', new_content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Refactored {filepath}")

def main():
    base_dir = 'e:/AgentMark/AgentMark/ai-service'
    
    # Folders to refactor
    targets = ['agents', 'llm', 'api', 'workflow', 'utils']
    
    for target in targets:
        target_dir = os.path.join(base_dir, target)
        if not os.path.exists(target_dir):
            continue
            
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith('.py') and file != 'logger.py':
                    refactor_file(os.path.join(root, file))
                    
    # Also refactor main.py, run.py
    for file in ['main.py', 'run.py']:
        path = os.path.join(base_dir, file)
        if os.path.exists(path):
            refactor_file(path)

if __name__ == '__main__':
    main()
