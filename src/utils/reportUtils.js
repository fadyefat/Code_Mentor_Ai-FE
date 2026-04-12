import { Zap, FileCode, Activity, Code, Terminal } from 'lucide-react';

export const formatReportData = (apiResponse) => {
    // 1. Generate ID
    const id = apiResponse.id || Date.now();

    // 2. Format Date (FIXED: Use DB date if available) 🛠️
    const dateObj = apiResponse.created_at ? new Date(apiResponse.created_at) : new Date();
    const date = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // 3. Status & Color Logic
    let status = 'Good';
    let color = 'from-blue-500 to-cyan-500';
    let icon = Code;
    // تأكدنا إن الاسم ده مطابق لعمود الداتابيز
    const score = apiResponse.over_all_score || 0;

    if (score >= 90) {
        status = 'Excellent';
        color = 'from-green-500 to-emerald-500';
        icon = Zap;
    } else if (score >= 75) {
        status = 'Great';
        color = 'from-blue-500 to-cyan-500';
        icon = Activity;
    } else if (score >= 60) {
        status = 'Good';
        color = 'from-purple to-pink-500';
        icon = FileCode;
    } else {
        status = 'Needs Improvement';
        color = 'from-orange-500 to-red-500';
        icon = Terminal;
    }

    const formatted = {
        id: id,
        // هنا ربطنا الأعمدة بذكاء
        language: apiResponse.lang || 'Unknown',
        title: apiResponse.title || 'Code Analysis',
        sub_title: apiResponse.sub_title || '',
        date: date,
        score: score,
        status: status,
        color: color,
        icon: icon, // React Component
        iconName: icon === Zap ? 'Zap' : icon === Activity ? 'Activity' : icon === FileCode ? 'FileCode' : 'Terminal', // String Name

        // Mapped Metrics (User requested specifically 'metrics' with camelCase)
        metrics: {
            readability: apiResponse.readability || 0,
            maintainability: apiResponse.maintainability || 0,
            efficiency: apiResponse.efficiency || 0,

            // Explicit mapping for new fields with fallbacks
            problemSolving: apiResponse.problem_solving || apiResponse.problemSolving || 0,
            edgeCases: apiResponse.edge_cases_handling || apiResponse.edge_cases || apiResponse.edgeCases || 0,
            correctness: apiResponse.correctness || 0
        },

        // Keep 'quality' for backward compatibility if needed, or just rely on metrics. 
        // We'll update UI to use 'metrics'.

        issues: {
            critical: apiResponse.critical || 0,
            major: apiResponse.major || 0,
            medium: apiResponse.medium || apiResponse.warning || 0,
            minor: apiResponse.minor || apiResponse.suggestions || 0,
            list: (apiResponse.issues || []).map(issue => {
                let foundSkill = issue.skill || issue.category || issue.type || issue.metric || issue.affected_metric || issue.associated_skill || issue.related_skill || issue.code_quality || '';
                
                if (!foundSkill || foundSkill.toLowerCase() === 'syntax error') {
                    // Deep scan object values for any of the known skill names
                    const possibleSkills = ['readability', 'maintainability', 'efficiency', 'problem solving', 'edge cases', 'correctness'];
                    for (const key of Object.keys(issue)) {
                        const val = issue[key];
                        if (typeof val === 'string') {
                            const lowerVal = val.toLowerCase();
                            const matched = possibleSkills.find(s => lowerVal.includes(s));
                            if (matched && key !== 'message') {
                                foundSkill = val;
                                break;
                            }
                        }
                    }
                }
                
                return {
                    line: issue.line,
                    severity: issue.severity,
                    message: issue.message,
                    skill: foundSkill
                };
            })
        },
        snippet: apiResponse.submitted_solution || apiResponse.solution_code || apiResponse.code || apiResponse.user_code || apiResponse.solution || apiResponse.snippet || '', // User's code
        problem_desc: apiResponse.submitted_problem || apiResponse.problem_code || apiResponse.problem || apiResponse.problem_desc || '', // The problem description
        suggested_solution: apiResponse.suggested_solution || apiResponse.corrected_code || apiResponse.ai_code || apiResponse.suggestion || '',
        diff_view: apiResponse.diff_view || apiResponse.diff || apiResponse.corrected_code || '',
        recommendations: [
            ...(Array.isArray(apiResponse.recommendations) ? apiResponse.recommendations : (typeof apiResponse.recommendations === 'string' ? [apiResponse.recommendations] : [])),
            ...(Array.isArray(apiResponse.suggestions) ? apiResponse.suggestions : (typeof apiResponse.suggestions === 'string' ? [apiResponse.suggestions] : []))
        ],
        search_topics: apiResponse.search_topics || [],
        roadmap: apiResponse.roadmap || null,
        difficulty: apiResponse.difficulty || apiResponse.problem_difficulty || ''
    };

    return formatted;
};

export const getIconByName = (name) => {
    switch (name) {
        case 'Zap': return Zap;
        case 'Activity': return Activity;
        case 'FileCode': return FileCode;
        case 'Terminal': return Terminal;
        default: return Code;
    }
};