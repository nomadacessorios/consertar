import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  fullName?: string; // legacy support
  store_id?: string;
  storeId?: string; // legacy support
  role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const requestData: CreateUserRequest = await req.json();
    
    const email = requestData.email;
    const password = requestData.password;
    const fullName = requestData.full_name || requestData.fullName;
    const storeId = requestData.store_id || requestData.storeId;
    const role = requestData.role || 'store_manager';

    console.log('Attempting to create user:', email);

    // 1. Create user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error('Error creating user in auth.users:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('User created in auth.users:', userId);

    // 2. Ensure profile exists and update store_id
    // The handle_new_user trigger should create the profile.
    // We will try to update it, and if it doesn't exist (e.g., trigger failed), we'll insert it.
    
    let profileExists = false;
    const { data: existingProfile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchProfileError && fetchProfileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('Error fetching profile:', fetchProfileError);
      // Continue, but log the error.
    } else if (existingProfile) {
      profileExists = true;
      console.log('Profile already exists for user:', userId);
    }

    if (profileExists) {
      console.log('Updating existing profile with store_id:', storeId);
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          store_id: storeId || null,
          full_name: fullName, // Ensure full_name is also updated/set
          email: email, // Ensure email is also updated/set
          approved: true // Ensure approved is true for admin-created users
        })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
        // Don't fail completely, just log the error
        console.warn('User created but profile update failed');
      }
    } else {
      console.log('Profile does not exist, inserting new profile for user:', userId);
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          store_id: storeId || null,
          approved: true, // Admin-created users are always approved
          email: email,
        });

      if (insertProfileError) {
        console.error('Error inserting profile:', insertProfileError);
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${insertProfileError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Create user role
    console.log('Creating user role:', role);
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        store_id: storeId || null
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
      // Don't fail completely, just log the error
      console.warn('User created but role assignment failed');
    }

    console.log('User created and configured successfully');

    return new Response(
      JSON.stringify({ success: true, userId: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);