import { formatNumberInput } from '../../../helpers/number'
import { logger } from '../../../utils/logger'

/**
 * Creates a handler for the "from" amount input changes
 */
export const createFromAmountChangeHandler = (
  form: any,
  getAssetPrecision: (asset: string) => number,
  parseAssetAmount: (
    amount: string | undefined | null,
    asset: string
  ) => number,
  setDebouncedFromAmount: (amount: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const fromAsset = form.getValues().fromAsset
    const precision = getAssetPrecision(fromAsset)

    try {
      const formattedValue = formatNumberInput(value, precision)

      // Always update the form value with options to ensure validation is triggered
      form.setValue('from', formattedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })

      // Only update the other field if we have a complete number
      if (!formattedValue.endsWith('.') && formattedValue !== '') {
        const numValue = parseAssetAmount(formattedValue, fromAsset)

        if (numValue === 0) {
          form.setValue('to', '', {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        } else {
          // Don't cap the values - allow the user to input any amount
          // Validation errors will show when values are out of range
          setDebouncedFromAmount(formattedValue)
        }
      } else {
        // Incomplete number (e.g., "5.")
        setDebouncedFromAmount(formattedValue)
      }

      // Validate form immediately
      form.trigger('from')
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('from', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      form.setValue('to', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }
}

/**
 * Creates a handler for the "to" amount input changes
 */
export const createToAmountChangeHandler = (
  form: any,
  getAssetPrecision: (asset: string) => number,
  parseAssetAmount: (
    amount: string | undefined | null,
    asset: string
  ) => number,
  setDebouncedToAmount: (amount: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const toAsset = form.getValues().toAsset
    const precision = getAssetPrecision(toAsset)

    try {
      const formattedValue = formatNumberInput(value, precision)

      // Always update the form value with options to ensure validation is triggered
      form.setValue('to', formattedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })

      // Only update the other field if we have a complete number
      if (!formattedValue.endsWith('.') && formattedValue !== '') {
        const numValue = parseAssetAmount(formattedValue, toAsset)

        if (numValue === 0) {
          form.setValue('from', '', {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        } else {
          // Don't cap the values - allow the user to input any amount
          // Validation errors will show when values are out of range
          setDebouncedToAmount(formattedValue)
        }
      } else {
        // Incomplete number (e.g., "5.")
        setDebouncedToAmount(formattedValue)
      }

      // Validate form immediately
      form.trigger('to')
    } catch (error) {
      logger.error('Error handling amount change:', error)
      form.setValue('to', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      form.setValue('from', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }
}

/**
 * Creates a debounced handler for updating the "to" amount based on "from" changes
 */
export const createDebouncedFromEffectHandler = (
  debouncedFromAmount: string,
  updatePending: boolean,
  updateToAmount: (amount: string) => void,
  setIsToAmountLoading: (isLoading: boolean) => void,
  setUpdatePending: (isPending: boolean) => void
) => {
  if (
    !debouncedFromAmount ||
    debouncedFromAmount.endsWith('.') ||
    updatePending
  ) {
    return () => {}
  }

  setUpdatePending(true)

  return () => {
    const timer = setTimeout(() => {
      // Always update when size buttons are clicked, even if the formatted amount is the same
      // as before (which can happen with certain percentage values)
      setIsToAmountLoading(true)
      updateToAmount(debouncedFromAmount)
      setIsToAmountLoading(false)
      setUpdatePending(false)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }
}

/**
 * Creates a debounced handler for updating the "from" amount based on "to" changes
 */
export const createDebouncedToEffectHandler = (
  debouncedToAmount: string,
  previousToAmount: string | undefined,
  updatePending: boolean,
  calculateRate: () => number,
  form: any,
  parseAssetAmount: (
    amount: string | undefined | null,
    asset: string
  ) => number,
  formatAmount: (amount: number, asset: string) => string,
  setUpdatePending: (isPending: boolean) => void
) => {
  if (!debouncedToAmount || debouncedToAmount.endsWith('.') || updatePending) {
    return () => {}
  }

  setUpdatePending(true)

  return () => {
    const timer = setTimeout(() => {
      if (debouncedToAmount !== previousToAmount) {
        try {
          const rate = calculateRate()
          const fromAmount =
            parseAssetAmount(debouncedToAmount, form.getValues().toAsset) / rate
          form.setValue(
            'from',
            formatAmount(fromAmount, form.getValues().fromAsset)
          )
        } catch (error) {
          logger.error('Error calculating from amount:', error)
        }
      }
      setUpdatePending(false)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }
}
