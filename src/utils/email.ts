import { createEmailSchema } from '@opengovsg/starter-kitty-validators/email'
import isEmail from 'validator/lib/isEmail'

const emailSchema = createEmailSchema({
  domains: [
    { domain: 'gov.sg', includeSubdomains: true },
    { domain: 'mohh.com.sg', includeSubdomains: true },
    { domain: 'synapxe.sg', includeSubdomains: true },
    { domain: '1fss.com.sg', includeSubdomains: true },
    { domain: 'sgh.com.sg', includeSubdomains: true },
    { domain: 'nccs.com.sg', includeSubdomains: true },
    { domain: 'ndcs.com.sg', includeSubdomains: true },
    { domain: 'nhcs.com.sg', includeSubdomains: true },
    { domain: 'nni.com.sg', includeSubdomains: true },
    { domain: 'skh.com.sg', includeSubdomains: true },
    { domain: 'cgh.com.sg', includeSubdomains: true },
    { domain: 'kkh.com.sg', includeSubdomains: true },
    { domain: 'snec.com.sg', includeSubdomains: true },
    { domain: 'scbb.com.sg', includeSubdomains: true },
    { domain: 'singhealth.com.sg', includeSubdomains: true },
    { domain: 'notu.com.sg', includeSubdomains: true },
    { domain: 'seri.com.sg', includeSubdomains: true },
    { domain: 'upec.sg', includeSubdomains: true },
    { domain: 'singhealthacademy.edu.sg', includeSubdomains: true },
    { domain: 'singhealthch.com.sg', includeSubdomains: true },
    { domain: 'ssmc.sg', includeSubdomains: true },
    { domain: 'ndc.com.sg', includeSubdomains: true },
    { domain: 'cris.sg', includeSubdomains: true },
    { domain: 'nhghealth.com.sg', includeSubdomains: true },
    { domain: 'geri.com.sg', includeSubdomains: true },
    { domain: 'nuhs.edu.sg', includeSubdomains: true },
    { domain: 'alpshealthcare.com.sg', includeSubdomains: true },
    { domain: 'vanguardhealthcare.com.sg', includeSubdomains: true },
    { domain: 'hhom.com.sg', includeSubdomains: true },
  ],
})

/**
 * Returns whether the passed value is a valid government email.
 */
export const isGovEmail = (value: unknown) => {
  return (
    typeof value === 'string' &&
    isEmail(value) &&
    emailSchema.safeParse(value).success
  )
}
