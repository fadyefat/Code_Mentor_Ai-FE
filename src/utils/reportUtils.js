import { Zap, FileCode, Activity, Code, Terminal } from 'lucide-react';

export const formatLanguageName = (lang) => {
    if (!lang || lang.trim() === '') return 'Unknown';
    const lower = lang.trim().toLowerCase();
    switch (lower) {
        case 'cpp':
        case 'c++':
            return 'C++';
        case 'csharp':
        case 'c#':
            return 'C#';
        case 'javascript':
        case 'js':
            return 'JavaScript';
        case 'typescript':
        case 'ts':
            return 'TypeScript';
        case 'python':
        case 'py':
            return 'Python';
        case 'java':
            return 'Java';
        case 'php':
            return 'PHP';
        case 'html':
            return 'HTML';
        case 'css':
            return 'CSS';
        case 'ruby':
            return 'Ruby';
        case 'go':
        case 'golang':
            return 'Go';
        case 'rust':
            return 'Rust';
        case 'swift':
            return 'Swift';
        case 'kotlin':
            return 'Kotlin';
        case 'not detected':
            return 'Not detected';
        default:
            return lang.trim().charAt(0).toUpperCase() + lang.trim().slice(1).toLowerCase();
    }
};

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
        language: formatLanguageName(apiResponse.lang),
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

        issues: (() => {
            // Gather all raw issues from the main array
            const rawIssues = [...(apiResponse.issues || [])];
            
            // Sweep the feedback object to find hidden issues (hallucinated by AI)
            if (apiResponse.feedback && typeof apiResponse.feedback === 'object') {
                for (const [skillName, skillData] of Object.entries(apiResponse.feedback)) {
                    if (skillData && Array.isArray(skillData.issues)) {
                        skillData.issues.forEach(fbIssue => {
                            // Prevent duplicates
                            const isDuplicate = rawIssues.some(r => 
                                r.message === fbIssue.message || 
                                (r.line == fbIssue.line && r.severity === fbIssue.severity && r.message?.substring(0,10) === fbIssue.message?.substring(0,10))
                            );
                            if (!isDuplicate) {
                                rawIssues.push({
                                    ...fbIssue,
                                    feedback_type: fbIssue.feedback_type || skillName,
                                    line: fbIssue.line || 'General'
                                });
                            } else {
                                const existingIndex = rawIssues.findIndex(r => 
                                    r.message === fbIssue.message || 
                                    (r.line == fbIssue.line && r.severity === fbIssue.severity && r.message?.substring(0,10) === fbIssue.message?.substring(0,10))
                                );
                                if (existingIndex >= 0) {
                                    rawIssues[existingIndex].feedback_type = fbIssue.feedback_type || skillName;
                                }
                            }
                        });
                    }
                }
            }

            const list = rawIssues.map(issue => {
                let foundSkill = issue.feedback_type || issue.skill || issue.category || issue.type || issue.metric || issue.affected_metric || issue.associated_skill || issue.related_skill || issue.code_quality || '';
                
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
                
                let sev = String(issue.severity || 'minor').toLowerCase();
                let normalizedSeverity = 'minor';
                if (sev.includes('critical')) normalizedSeverity = 'critical';
                else if (sev.includes('major')) normalizedSeverity = 'major';
                else if (sev.includes('medium') || sev.includes('warning')) normalizedSeverity = 'medium';

                return {
                    line: issue.line,
                    severity: normalizedSeverity,
                    message: issue.message,
                    skill: foundSkill || 'Code Quality'
                };
            });

            // Post-process: ensure missing skills with <100 scores get at least one issue.
            const metrics = {
                'Readability': apiResponse.metrics?.readability ?? apiResponse.readability ?? 100,
                'Documentation': apiResponse.metrics?.documentation ?? apiResponse.maintainability ?? 100,
                'Efficiency': apiResponse.metrics?.efficiency ?? apiResponse.efficiency ?? 100,
                'Problem-Solving Approach': apiResponse.metrics?.problemSolving ?? apiResponse.problem_solving ?? 100,
                'Edge Cases Handling': apiResponse.metrics?.edgeCases ?? apiResponse.edge_cases_handling ?? 100,
                'Correctness': apiResponse.metrics?.correctness ?? apiResponse.correctness ?? 100
            };

            for (const [skillName, score] of Object.entries(metrics)) {
                if (Number(score) < 100) {
                    const hasIssue = list.some(i => i.skill.toLowerCase().includes(skillName.toLowerCase().split('-')[0].split(' ')[0]));
                    if (!hasIssue) {
                        // Find an issue that is "over-represented" (e.g., we have 3 problem-solving issues but only need 1)
                        const candidate = list.find(i => {
                            const skillCount = list.filter(other => other.skill === i.skill).length;
                            return skillCount > 1; // It's a duplicate skill, we can safely steal it!
                        });

                        if (candidate) {
                            candidate.skill = skillName;
                        }
                    }
                }
            }

            let criticalCount = 0;
            let majorCount = 0;
            let mediumCount = 0;
            let minorCount = 0;

            list.forEach(issue => {
                if (issue.severity === 'critical') criticalCount++;
                else if (issue.severity === 'major') majorCount++;
                else if (issue.severity === 'medium') mediumCount++;
                else minorCount++;
            });

            return {
                critical: criticalCount,
                major: majorCount,
                medium: mediumCount,
                minor: minorCount,
                list: list
            };
        })(),
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