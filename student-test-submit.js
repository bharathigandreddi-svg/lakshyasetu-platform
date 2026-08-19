// LakshyaSetu student test submission module
// This module is intentionally isolated until student.html imports it.
// It calculates score from the fetched question set and persists an attempt through Supabase.
(function(){
  window.LakshyaSetuTestSubmit = async function({supabase, testId, userId, questions, answers}) {
    if (!supabase || !testId || !userId) throw new Error('Test session is incomplete.');
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const safeAnswers = answers || {};
    let correct = 0;
    safeQuestions.forEach(q => {
      const selected = safeAnswers[q.id];
      if (selected != null && String(selected) === String(q.correct_answer)) correct++;
    });
    const total = safeQuestions.length;
    const score = correct;
    const percentage = total ? Math.round((score / total) * 10000) / 100 : 0;
    const { data, error } = await supabase.from('ls_test_attempts').insert({
      test_id: testId,
      user_id: userId,
      score,
      total_questions: total,
      percentage,
      submitted_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    return { attempt: data, score, total, percentage };
  };
})();
