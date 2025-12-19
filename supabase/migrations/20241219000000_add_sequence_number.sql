-- Add sequence_number column to chat_messages table for proper message ordering
-- This is needed to maintain the order of messages in a chat session

-- Add the sequence_number column
ALTER TABLE public.chat_messages
ADD COLUMN sequence_number INTEGER;

-- Create a unique constraint on chat_id + sequence_number
-- This ensures each message in a chat has a unique sequence number
CREATE UNIQUE INDEX idx_chat_messages_chat_id_sequence ON public.chat_messages(chat_id, sequence_number);

-- Add an index on sequence_number for ordering queries
CREATE INDEX idx_chat_messages_sequence_number ON public.chat_messages(sequence_number);

-- Update existing messages to have sequence numbers based on created_at
-- This backfills sequence numbers for any existing messages
WITH numbered_messages AS (
  SELECT
    id,
    chat_id,
    ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at) - 1 AS seq_num
  FROM public.chat_messages
)
UPDATE public.chat_messages cm
SET sequence_number = nm.seq_num
FROM numbered_messages nm
WHERE cm.id = nm.id;

-- Make sequence_number NOT NULL after backfilling
ALTER TABLE public.chat_messages
ALTER COLUMN sequence_number SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.chat_messages.sequence_number IS 'Message order within a chat (0-indexed)';
