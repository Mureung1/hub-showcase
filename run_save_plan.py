import importlib.util
import json

spec = importlib.util.spec_from_file_location('planning_agent_module', 'planning_agent.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

out = mod.generate_plan('일반 기능 개발을 위해 작업을 분해하고 우선순위를 정해 단계별 계획을 만들어줘.', domain='general', output='json')
saved = mod.save_plan_to_folder(out['content'], folder='plans', name='user_plan')
print(json.dumps(saved, ensure_ascii=False))
