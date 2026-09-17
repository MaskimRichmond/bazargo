$urls = @{
  "public/demo/products/nike.jpg" = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"
  "public/demo/products/iphone.jpg" = "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600&q=80"
  "public/demo/products/macbook.jpg" = "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80"
  "public/demo/products/camry.jpg" = "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600&q=80"
  "public/demo/stores/techstore.jpg" = "https://images.unsplash.com/photo-1531297172867-4b5cb3dbcb13?w=200&q=80"
  "public/demo/stores/autohouse.jpg" = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&q=80"
  "public/demo/stores/homecomfort.jpg" = "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&q=80"
  "public/demo/stores/stylekg.jpg" = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&q=80"
}

foreach ($entry in $urls.GetEnumerator()) {
  Write-Host "Downloading $($entry.Name)..."
  Invoke-WebRequest -Uri $entry.Value -OutFile $entry.Name -UseBasicParsing
}
Write-Host "Done!"
