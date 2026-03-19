import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProducts, type Product } from "@/hooks/use-products";

const transactionSchema = z.object({
  productId: z.string().min(1, { message: "Please select a product" }),
  transactionDate: z.date({
    required_error: "Please select a transaction date",
  }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1" }),
  salesPrice: z.coerce.number().min(0.01, { message: "Sales price must be greater than 0" }),
  commission: z.coerce.number().min(0, { message: "Commission cannot be negative" }),
  finalAmount: z.coerce.number().min(0, { message: "Final amount cannot be negative" }),
  marketplace: z.string().min(1, { message: "Please enter the marketplace name" }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AddProductTransactionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculationType, setCalculationType] = useState<"commission" | "final">("commission");

  const fromMonetization = searchParams.get('from') === 'monetization';

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      productId: id || "",
      transactionDate: new Date(),
      quantity: 1,
      salesPrice: 0,
      commission: 0,
      finalAmount: 0,
      marketplace: "",
    },
  });

  const watchQuantity = form.watch("quantity");
  const watchProductId = form.watch("productId");
  const watchSalesPrice = form.watch("salesPrice");
  const watchCommission = form.watch("commission");
  const watchFinalAmount = form.watch("finalAmount");

  const { products, isLoadingProducts, createTransaction: createTransactionMutation } = useProducts();

  const selectedProduct = products.find(p => p.id === watchProductId);

  useEffect(() => {
    if (selectedProduct && selectedProduct.price !== form.getValues("salesPrice")) {
      form.setValue("salesPrice", selectedProduct.price);
    }
  }, [selectedProduct, form]);

  useEffect(() => {
    const salesPrice = Number(watchSalesPrice) || 0;
    const quantity = Number(watchQuantity) || 0;
    const commission = Number(watchCommission) || 0;
    const finalAmount = Number(watchFinalAmount) || 0;

    const totalSales = salesPrice * quantity;

    if (calculationType === "commission") {
      const calculatedFinalAmount = totalSales - commission;
      if (Math.abs(calculatedFinalAmount - finalAmount) > 0.01) {
        form.setValue("finalAmount", calculatedFinalAmount);
      }
    } else {
      const calculatedCommission = totalSales - finalAmount;
      if (Math.abs(calculatedCommission - commission) > 0.01) {
        form.setValue("commission", calculatedCommission);
      }
    }
  }, [watchQuantity, watchSalesPrice, watchCommission, watchFinalAmount, calculationType, form]);

  const createTransaction = useMutation({
    mutationFn: async (data: any) => {
      await createTransactionMutation.mutateAsync({
        product_id: data.productId,
        product_name: selectedProduct?.name || "",
        quantity: data.quantity,
        total_amount: data.totalAmount,
        net_amount: data.netAmount,
        commission: data.commission,
        platform: data.platform,
        transaction_date: data.transactionDate,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });

      if (id) {
        navigate(`/products/${id}`);
      } else {
        navigate("/revenue/products");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: TransactionFormValues) => {
    const totalAmount = values.salesPrice * values.quantity;

    const transactionData = {
      productId: values.productId,
      transactionDate: values.transactionDate.toISOString(),
      quantity: values.quantity,
      platform: values.marketplace,
      totalAmount: totalAmount,
      commission: values.commission,
      netAmount: values.finalAmount,
      salesPrice: values.salesPrice,
    };

    createTransaction.mutate(transactionData);
  };

  const handleGoBack = () => {
    if (id) {
      navigate(`/products/${id}`);
    } else {
      navigate("/revenue/products");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Product Transaction</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record a new product sale transaction
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
          {isLoadingProducts ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4"></div>
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border rounded-md border-dashed border-muted">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-center mb-4">You need to create a product before recording transactions</p>
              <Button onClick={() => navigate("/monetization?tab=products")}>
                Add a product first
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Product Selection */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transaction Date */}
                <FormField
                  control={form.control}
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Transaction Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sales Price */}
                <FormField
                  control={form.control}
                  name="salesPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} min={0.01} />
                      </FormControl>
                      <FormDescription>
                        {selectedProduct && (
                          <>
                            Default price: ${selectedProduct.price.toFixed(2)} per unit
                          </>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calculation Type Tabs */}
                <div className="space-y-2">
                  <FormLabel>Calculation Method</FormLabel>
                  <Tabs
                    value={calculationType}
                    onValueChange={(value) => setCalculationType(value as "commission" | "final")}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="commission">Enter Commission</TabsTrigger>
                      <TabsTrigger value="final">Enter Final Amount</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Commission */}
                {calculationType === "commission" && (
                  <FormField
                    control={form.control}
                    name="commission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission/Fees</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Final Amount */}
                {calculationType === "final" && (
                  <FormField
                    control={form.control}
                    name="finalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Final Amount Received</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Marketplace */}
                <FormField
                  control={form.control}
                  name="marketplace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marketplace</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Where the product was sold (e.g., Etsy, Amazon, your website)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transaction Summary */}
                {selectedProduct && (
                  <div className="bg-muted p-4 rounded-md">
                    <p className="font-medium mb-2">Transaction Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">Product:</p>
                      <p>{selectedProduct.name}</p>
                      <p className="text-muted-foreground">Quantity:</p>
                      <p>{watchQuantity}</p>
                      <p className="text-muted-foreground">Total Sales:</p>
                      <p>${((Number(watchSalesPrice) || 0) * (Number(watchQuantity) || 0)).toFixed(2)}</p>
                      <p className="text-muted-foreground">Commission/Fees:</p>
                      <p>${Number(watchCommission || 0).toFixed(2)}</p>
                      <p className="text-muted-foreground">Final Amount:</p>
                      <p>${Number(watchFinalAmount || 0).toFixed(2)}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTransaction.isPending || !watchProductId}
                  >
                    {createTransaction.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create Transaction"}
                  </Button>
                </div>
              </form>
            </Form>
        </div>
      </div>
    </div>
  );
}
