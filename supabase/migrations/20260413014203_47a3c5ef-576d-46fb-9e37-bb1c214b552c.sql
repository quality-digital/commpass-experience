-- Add unique constraint to prevent duplicate quiz completions
ALTER TABLE public.user_quizzes 
ADD CONSTRAINT user_quizzes_user_quiz_unique UNIQUE (user_id, quiz_id);

-- Add unique constraint to prevent duplicate mission completions
ALTER TABLE public.user_missions 
ADD CONSTRAINT user_missions_user_mission_unique UNIQUE (user_id, mission_id);