import { importCategoriesFromJsonAction } from "../app/admin/categories/actions";

async function testImport() {
  try {
    const result = await importCategoriesFromJsonAction();
    console.log("Import result:", result);
  } catch (error) {
    console.error("Import error:", error);
  }
}

testImport();
