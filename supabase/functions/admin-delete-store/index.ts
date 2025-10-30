import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteStoreRequest {
  storeId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    console.log('Received OPTIONS request for admin-delete-store');
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

    const { storeId }: DeleteStoreRequest = await req.json();

    console.log('Deleting store and associated data for storeId:', storeId);

    // 1. Get all order IDs for the store
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('store_id', storeId);

    if (ordersError) throw ordersError;
    const orderIds = ordersData.map(order => order.id);

    // 2. Delete order_items
    if (orderIds.length > 0) {
      const { error: orderItemsError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (orderItemsError) throw orderItemsError;
      console.log(`Deleted ${orderIds.length} order items.`);
    }

    // 3. Delete loyalty_transactions linked to orders
    if (orderIds.length > 0) {
      const { error: loyaltyTransactionsOrderError } = await supabaseAdmin
        .from('loyalty_transactions')
        .delete()
        .in('order_id', orderIds);
      if (loyaltyTransactionsOrderError) throw loyaltyTransactionsOrderError;
      console.log(`Deleted loyalty transactions linked to orders.`);
    }

    // 4. Delete orders
    const { error: deleteOrdersError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('store_id', storeId);
    if (deleteOrdersError) throw deleteOrdersError;
    console.log(`Deleted orders for store ${storeId}.`);

    // 5. Delete cash_register entries
    const { error: deleteCashRegisterError } = await supabaseAdmin
      .from('cash_register')
      .delete()
      .eq('store_id', storeId);
    if (deleteCashRegisterError) throw deleteCashRegisterError;
    console.log(`Deleted cash register entries for store ${storeId}.`);

    // 6. Delete loyalty_rules
    const { error: deleteLoyaltyRulesError } = await supabaseAdmin
      .from('loyalty_rules')
      .delete()
      .eq('store_id', storeId);
    if (deleteLoyaltyRulesError) throw deleteLoyaltyRulesError;
    console.log(`Deleted loyalty rules for store ${storeId}.`);

    // 7. Delete loyalty_transactions not linked to orders (e.g., manual adjustments)
    // First, get customer IDs for the store
    const { data: customerIdsData, error: customerIdsError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('store_id', storeId);
    if (customerIdsError) throw customerIdsError;
    const customerIds = customerIdsData.map(customer => customer.id);

    if (customerIds.length > 0) {
      const { error: loyaltyTransactionsCustomerError } = await supabaseAdmin
        .from('loyalty_transactions')
        .delete()
        .in('customer_id', customerIds);
      if (loyaltyTransactionsCustomerError) throw loyaltyTransactionsCustomerError;
      console.log(`Deleted loyalty transactions linked to customers of store ${storeId}.`);
    }

    // 8. Delete customers
    const { error: deleteCustomersError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('store_id', storeId);
    if (deleteCustomersError) throw deleteCustomersError;
    console.log(`Deleted customers for store ${storeId}.`);

    // 9. Delete products
    const { error: deleteProductsError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('store_id', storeId);
    if (deleteProductsError) throw deleteProductsError;
    console.log(`Deleted products for store ${storeId}.`);

    // 10. Delete categories
    const { error: deleteCategoriesError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('store_id', storeId);
    if (deleteCategoriesError) throw deleteCategoriesError;
    console.log(`Deleted categories for store ${storeId}.`);

    // 11. Get users (profiles) linked to the store
    const { data: profilesToDelete, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('store_id', storeId);

    if (profilesError) throw profilesError;

    // 12. Delete users from Supabase Auth and profiles table
    for (const profile of profilesToDelete) {
      console.log('Deleting user from Auth and Profiles:', profile.id);
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
      if (authDeleteError) {
        console.warn(`Failed to delete user ${profile.id} from Auth: ${authDeleteError.message}. Attempting to delete from profiles anyway.`);
        // Continue even if auth delete fails, try to clean up profile
      }
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', profile.id);
      if (profileDeleteError) {
        console.error(`Failed to delete profile ${profile.id}: ${profileDeleteError.message}`);
        throw profileDeleteError; // Re-throw if profile deletion fails
      }
    }
    console.log(`Deleted ${profilesToDelete.length} users linked to store ${storeId}.`);

    // 13. Finally, delete the store itself
    const { error: deleteStoreError } = await supabaseAdmin
      .from('stores')
      .delete()
      .eq('id', storeId);
    if (deleteStoreError) throw deleteStoreError;
    console.log(`Store ${storeId} deleted successfully.`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-delete-store function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
