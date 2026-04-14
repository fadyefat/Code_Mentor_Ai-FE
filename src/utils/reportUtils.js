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

        // Robust Metric Extraction: Check flat response, nested metrics object, and multiple synonyms to safeguard against AI JSON schema drift
        metrics: (() => {
            const m = apiResponse.metrics || {};
            const getVal = (...keys) => {
                for (const k of keys) {
                    if (apiResponse[k] !== undefined && apiResponse[k] !== null) return Number(apiResponse[k]);
                    if (m[k] !== undefined && m[k] !== null) return Number(m[k]);
                }
                return 0; // Default to 0 if totally absent
            };

            return {
                readability: getVal('readability', 'readability_score', 'code_readability'),
                documentation: getVal('documentation', 'maintainability', 'code_documentation', 'documentation_score', 'comments_score', 'maintainability_score'),
                efficiency: getVal('efficiency', 'performance', 'efficiency_score', 'optimization'),
                problemSolving: getVal('problem_solving', 'problemSolving', 'logic', 'problem_solving_score', 'solution_quality'),
                edgeCases: getVal('edge_cases_handling', 'edge_cases', 'edgeCases', 'robustness', 'error_handling'),
                correctness: getVal('correctness', 'accuracy', 'functionality', 'correctness_score', 'validity')
            };
        })(),

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
                    const possibleSkills = ['readability', 'documentation', 'efficiency', 'problem solving', 'edge cases', 'correctness'];
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
                    skill: foundSkill || 'Code Quality'
                };
            })
        },
        snippet: apiResponse.submitted_solution || apiResponse.solution_code || apiResponse.code || apiResponse.user_code || apiResponse.solution || apiResponse.snippet || '', // User's code
        problem_desc: apiResponse.submitted_problem || apiResponse.problem_code || apiResponse.problem || apiResponse.problem_desc || '', // The problem description
        suggested_solution: apiResponse.suggested_solution || apiResponse.corrected_code || apiResponse.ai_code || apiResponse.suggestion || '',
        diff_view: apiResponse.diff_view || apiResponse.diff || apiResponse.corrected_code || '',
        recommendations: (() => {
            const recs = new Set();
            
            // 1. Array of possible top-level keys
            [
                apiResponse.recommendations, apiResponse.recommendation, 
                apiResponse.suggestions, apiResponse.suggestion, 
                apiResponse.improvements, apiResponse.best_practices
            ].forEach(source => {
                if (Array.isArray(source)) source.forEach(r => { if (typeof r === 'string' && r.trim()) recs.add(r.trim()); });
                else if (typeof source === 'string' && source.trim()) recs.add(source.trim());
            });

            // 2. Extract embedded recommendations from individual issues
            const issueList = Array.isArray(apiResponse.issues) ? apiResponse.issues : (apiResponse.issues?.list || []);
            if (Array.isArray(issueList)) {
                issueList.forEach(issue => {
                    if (issue.recommendation && typeof issue.recommendation === 'string' && issue.recommendation.trim()) {
                        recs.add(issue.recommendation.trim());
                    } else if (issue.suggestion && typeof issue.suggestion === 'string' && issue.suggestion.trim()) {
                        recs.add(issue.suggestion.trim());
                    }
                });
            }

            return Array.from(recs);
        })(),
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