-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  from_user_id UUID,
  post_id UUID,
  comment_id UUID,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification on post like
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  liker_name TEXT;
  reaction_text TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if liking own post
  IF post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker name
  SELECT display_name INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Map reaction type to Vietnamese
  CASE NEW.reaction_type
    WHEN 'like' THEN reaction_text := 'Thích';
    WHEN 'love' THEN reaction_text := 'Yêu thương';
    WHEN 'haha' THEN reaction_text := 'Haha';
    WHEN 'wow' THEN reaction_text := 'Wow';
    WHEN 'sad' THEN reaction_text := 'Buồn';
    WHEN 'angry' THEN reaction_text := 'Phẫn nộ';
    ELSE reaction_text := 'Thích';
  END CASE;
  
  INSERT INTO public.notifications (user_id, type, from_user_id, post_id, content)
  VALUES (
    post_author,
    'post_like',
    NEW.user_id,
    NEW.post_id,
    COALESCE(liker_name, 'Ai đó') || ' đã ' || reaction_text || ' bài viết của bạn'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_like_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

-- Function to create notification on comment
CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  commenter_name TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if commenting on own post
  IF post_author = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name
  SELECT display_name INTO commenter_name FROM public.profiles WHERE id = NEW.author_id;
  
  INSERT INTO public.notifications (user_id, type, from_user_id, post_id, comment_id, content)
  VALUES (
    post_author,
    'comment',
    NEW.author_id,
    NEW.post_id,
    NEW.id,
    COALESCE(commenter_name, 'Ai đó') || ' đã bình luận bài viết của bạn'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment();

-- Function to create notification on share
CREATE OR REPLACE FUNCTION public.notify_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  sharer_name TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if sharing own post
  IF post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get sharer name
  SELECT display_name INTO sharer_name FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, from_user_id, post_id, content)
  VALUES (
    post_author,
    'share',
    NEW.user_id,
    NEW.post_id,
    COALESCE(sharer_name, 'Ai đó') || ' đã chia sẻ bài viết của bạn'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_share_notify
  AFTER INSERT ON public.post_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_share();

-- Function to create notification on friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Get requester name
  SELECT display_name INTO requester_name FROM public.profiles WHERE id = NEW.follower_id;
  
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- New friend request
    INSERT INTO public.notifications (user_id, type, from_user_id, content)
    VALUES (
      NEW.following_id,
      'friend_request',
      NEW.follower_id,
      COALESCE(requester_name, 'Ai đó') || ' đã gửi yêu cầu kết bạn'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Friend request accepted - notify the requester
    SELECT display_name INTO requester_name FROM public.profiles WHERE id = NEW.following_id;
    INSERT INTO public.notifications (user_id, type, from_user_id, content)
    VALUES (
      NEW.follower_id,
      'friend_accepted',
      NEW.following_id,
      COALESCE(requester_name, 'Ai đó') || ' đã chấp nhận kết bạn với bạn'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request_notify
  AFTER INSERT OR UPDATE ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();