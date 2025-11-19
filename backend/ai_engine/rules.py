class RuleEngine:
    def __init__(self):
        self.policies = [
            {
                'role': 'Student',
                'location': 'Lecture Hall',
                'action': 'Streaming',
                'decision': 'DENY',
                'reason': 'No streaming in Lecture Hall'
            },
            {
                'role': 'Guest',
                'load_threshold': 80,
                'decision': 'THROTTLE',
                'reason': 'High network load'
            }
        ]

    def evaluate(self, context):
        # context: {role, location, action, current_load}
        
        for policy in self.policies:
            # Check Policy 1: Location based
            if 'location' in policy:
                if (context.get('role') == policy['role'] and 
                    context.get('location') == policy['location'] and
                    context.get('action') == policy['action']):
                    return {'decision': policy['decision'], 'reason': policy['reason']}
            
            # Check Policy 2: Load based
            if 'load_threshold' in policy:
                if (context.get('role') == policy['role'] and
                    context.get('current_load', 0) > policy['load_threshold']):
                    return {'decision': policy['decision'], 'reason': policy['reason']}
                    
        return {'decision': 'ALLOW', 'reason': 'Policy compliant'}
