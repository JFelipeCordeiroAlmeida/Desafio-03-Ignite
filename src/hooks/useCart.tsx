import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAmountInStock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);
      const productSelect = cart.find(product => product.id === productId);

      if (!productAmountInStock || productAmountInStock.amount <= 0) {
        throw new Error
      }

      if (productSelect) {
        if (productSelect.amount >= productAmountInStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const updateProduct = cart.map(product => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 }
          }
          else {
            return product;
          }
        });

        setCart(updateProduct)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProduct));
      }
      else {
        const productToAdd = await api.get(`products/${productId}`).then(response => response.data);
        const newProduct = { ...productToAdd, amount: 1 };
        const attCart = [...cart, newProduct];
        setCart(attCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(attCart));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productSelect = cart.find(product => product.id === productId);
      const productInCart= cart.filter(product => product.id !== productId);
      if (!productSelect) {
        throw new Error
      }
      setCart(productInCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productInCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productSelect = cart.find(product => product.id === productId);
      const productAmountInStock = await api.get<Stock>(`stock/${productId}`).then(response => response.data);

      if ( amount < 1 ) {
        throw new Error
      }

      cart.forEach(productOnCart => {
        if (productOnCart.id === productSelect?.id) {
          if (productOnCart.amount <= 0 || ((productSelect?.amount >= productAmountInStock.amount) && (amount > 0))) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }
          productOnCart.amount = amount;
          setCart([...cart]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        }
      });

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
