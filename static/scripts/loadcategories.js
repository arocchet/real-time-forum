export async function LoadCategories() {
  try {
    const response = await fetch("/api/categories", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Error in API request");
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (err) {
    console.error("Error loading categories:", err);
    return [];
  }
}
