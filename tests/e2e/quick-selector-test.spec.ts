import { test } from '@playwright/test';

test('QUICK TEST: Verify category input selector works', async ({ page }) => {
  // Navigate to /sell
  await page.goto('http://localhost:3000/sell');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Find the category input with our selector
  const categoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').first();
  
  console.log('Checking if category input exists...');
  const isVisible = await categoryInput.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`Category input visible: ${isVisible}`);
  
  if (isVisible) {
    console.log('✅ Selector works! Input field found');
    
    // Try to interact with it
    await categoryInput.click();
    console.log('✅ Clicked on input');
    
    // Type to see dropdown
    await categoryInput.fill('Huis');
    console.log('✅ Typed "Huis"');
    
    // Wait for dropdown options
    await page.waitForTimeout(1000);
    
    // Try to find category option
    const options = page.locator('button').filter({ hasText: /Huis/i });
    const optionCount = await options.count();
    console.log(`Found ${optionCount} options with "Huis"`);
    
    if (optionCount > 0) {
      console.log('✅ Dropdown options found!');
    }
  } else {
    console.log('❌ Selector did not find input');
    
    // Debug: list all inputs on page
    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    console.log(`Found ${inputCount} total input elements`);
    
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const placeholder = await allInputs.nth(i).getAttribute('placeholder');
      const name = await allInputs.nth(i).getAttribute('name');
      console.log(`  Input ${i}: placeholder="${placeholder}", name="${name}"`);
    }
  }
});
