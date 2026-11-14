import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler } from './handler.ts';
Deno.serve(createHandler(createClient,name=>Deno.env.get(name)));
