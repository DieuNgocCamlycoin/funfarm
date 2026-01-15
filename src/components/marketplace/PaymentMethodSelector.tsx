import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS, PaymentMethod } from "@/types/marketplace";
import camlyIcon from "@/assets/camly_coin.png";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  userBalance?: number;
  totalCamly?: number;
}

export default function PaymentMethodSelector({
  value,
  onChange,
  userBalance = 0,
  totalCamly = 0,
}: PaymentMethodSelectorProps) {
  const hasEnoughCamly = userBalance >= totalCamly;

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold flex items-center gap-2">
        💳 Chọn phương thức thanh toán
      </Label>
      
      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
        {PAYMENT_METHODS.filter(m => m.available).map((method) => {
          const isDisabled = method.id === 'camly' && !hasEnoughCamly;
          
          return (
            <div 
              key={method.id} 
              className={`flex items-center space-x-3 p-3 border rounded-xl transition-all ${
                value === method.id 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-border hover:border-green-300 hover:bg-muted/50'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <RadioGroupItem 
                value={method.id} 
                id={method.id} 
                disabled={isDisabled}
              />
              <Label 
                htmlFor={method.id} 
                className={`flex items-center gap-3 flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {method.id === 'camly' ? (
                  <img src={camlyIcon} alt="CAMLY" className="w-8 h-8" />
                ) : (
                  <span className="text-2xl">{method.icon}</span>
                )}
                <div className="flex-1">
                  <p className="font-medium">{method.nameVi}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                {method.id === 'camly' && !hasEnoughCamly && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                    Không đủ số dư
                  </span>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
