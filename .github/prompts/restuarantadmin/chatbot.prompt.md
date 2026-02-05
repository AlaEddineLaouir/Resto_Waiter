# Restaurant Admin Chatbot - MCP Project Extension

## Overview

Extend the existing Restaurant Menu Chatbot MVP to include an **Admin Chatbot** for restaurant administration tasks. This chatbot will leverage the existing MCP architecture and add new tools for CRUD operations on menu data.

This chatbot should be shown in the admin dashboard if the user has access to it and can only run actions that their role allows them to do.

An icon should be added and user can click to open the chat.

## New MCP Tools Required

### Menu Item Management
1. **create_menu_item** - Create a new dish with name, description, price, category, ingredients
2. **update_menu_item** - Update existing dish details (name, price, description, availability)
3. **delete_menu_item** - Remove a dish from the menu
4. **toggle_menu_item_visibility** - Enable or disable visibility of a menu item for customers without deleting
5. **duplicate_menu_item** - Clone an existing menu item
6. **bulk_update_menu_items** - Update multiple menu items at once
7. **bulk_delete_menu_items** - Delete multiple menu items at once
8. **reorder_menu_items** - Change the display order of items within a section
9. **set_menu_item_featured** - Mark a dish as featured/special
10. **archive_menu_item** - Archive a menu item (soft delete)
11. **restore_menu_item** - Restore an archived menu item

### Section Management
12. **create_section** - Create a new menu section (e.g., Appetizers, Mains, Desserts)
13. **update_section** - Update section name, order, or description
14. **delete_section** - Remove a section from the menu
15. **list_sections** - Get all menu sections
16. **reorder_sections** - Change the display order of sections
17. **toggle_section_visibility** - Enable or disable a section's visibility
18. **duplicate_section** - Clone a section with all its items
19. **move_items_between_sections** - Move menu items from one section to another

### Ingredient Management
20. **add_ingredient** - Add a new ingredient to the database
21. **update_ingredient** - Update ingredient details (allergens, availability)
22. **delete_ingredient** - Remove an ingredient
23. **link_ingredient_to_dish** - Associate ingredients with menu items
24. **unlink_ingredient_from_dish** - Remove ingredient association from a dish
25. **list_ingredients** - Get all ingredients
26. **search_ingredients** - Search ingredients by name or property
27. **set_ingredient_availability** - Mark ingredient as in-stock or out-of-stock
28. **bulk_update_ingredients** - Update multiple ingredients at once
29. **get_dishes_by_ingredient** - Find all dishes containing a specific ingredient

### Location Management
30. **create_location** - Add a new restaurant location
31. **update_location** - Update location details
32. **delete_location** - Remove a location
33. **list_locations** - Get all locations
34. **toggle_location_status** - Enable or disable a location (open/closed)
35. **set_location_hours** - Set operating hours for a location
36. **get_location_details** - Get detailed information about a location

### Location Menu Management
37. **activate_menu_for_location** - Enable a menu for a specific location
38. **deactivate_menu_for_location** - Disable a menu for a specific location
39. **get_location_menus** - Get all menus for a location
40. **copy_menu_to_location** - Copy a menu from one location to another
41. **set_location_specific_pricing** - Override item prices for a specific location
42. **sync_menus_across_locations** - Synchronize menu changes across multiple locations

### Pricing Management
43. **update_item_price** - Update price for a single item
44. **bulk_update_prices** - Update prices for multiple items
45. **apply_percentage_increase** - Apply percentage price increase to items
46. **set_happy_hour_pricing** - Configure time-based pricing
47. **create_price_modifier** - Create add-on pricing (e.g., extra cheese)
48. **list_price_modifiers** - Get all price modifiers

### Allergen & Dietary Management
49. **add_allergen** - Add a new allergen type to the system
50. **update_allergen** - Update allergen details
51. **delete_allergen** - Remove an allergen type
52. **list_allergens** - Get all allergen types
53. **add_dietary_tag** - Add dietary tags (vegan, gluten-free, etc.)
54. **update_dietary_tag** - Update dietary tag details
55. **delete_dietary_tag** - Remove a dietary tag
56. **list_dietary_tags** - Get all dietary tags
57. **tag_menu_item** - Apply dietary/allergen tags to a menu item
58. **untag_menu_item** - Remove tags from a menu item
59. **get_items_by_dietary_tag** - Find items matching dietary requirements

### Category Management
60. **create_category** - Create a new menu category
61. **update_category** - Update category details
62. **delete_category** - Remove a category
63. **list_categories** - Get all categories
64. **assign_item_to_category** - Assign a menu item to a category
65. **remove_item_from_category** - Remove item from a category

### Promotion & Special Management
66. **create_promotion** - Create a new promotion or discount
67. **update_promotion** - Update promotion details
68. **delete_promotion** - Remove a promotion
69. **list_promotions** - Get all active promotions
70. **activate_promotion** - Enable a promotion
71. **deactivate_promotion** - Disable a promotion
72. **create_combo_deal** - Create a combo meal deal
73. **update_combo_deal** - Update combo deal details
74. **delete_combo_deal** - Remove a combo deal
75. **list_combo_deals** - Get all combo deals

### Menu Version & Schedule Management
76. **create_menu_version** - Create a new version of the menu
77. **publish_menu_version** - Publish a menu version
78. **revert_menu_version** - Revert to a previous menu version
79. **list_menu_versions** - Get all menu versions
80. **schedule_menu_change** - Schedule a menu change for a specific date/time
81. **cancel_scheduled_change** - Cancel a scheduled menu change
82. **list_scheduled_changes** - Get all scheduled menu changes
83. **create_seasonal_menu** - Create a seasonal/limited-time menu
84. **activate_seasonal_menu** - Enable a seasonal menu
85. **deactivate_seasonal_menu** - Disable a seasonal menu

### Analytics & Reporting Tools
86. **get_menu_statistics** - Get statistics about menu items
87. **get_popular_items** - Get most popular menu items
88. **get_low_performing_items** - Get least popular items
89. **get_ingredient_usage_report** - Get ingredient usage statistics
90. **get_price_history** - Get price change history for items
91. **get_menu_change_log** - Get audit log of menu changes

### User & Permission Management
92. **list_admin_users** - Get all admin users
93. **get_user_permissions** - Get permissions for a user
94. **update_user_permissions** - Update user permissions
95. **get_audit_log** - Get audit log of admin actions
96. **get_user_activity** - Get activity log for a specific user

### Image & Media Management
97. **upload_item_image** - Upload an image for a menu item
98. **delete_item_image** - Remove an image from a menu item
99. **update_item_image** - Replace an image for a menu item
100. **set_section_image** - Set a header image for a section

### Import/Export Tools
101. **export_menu_to_csv** - Export menu data to CSV format
102. **export_menu_to_json** - Export menu data to JSON format
103. **import_menu_from_csv** - Import menu data from CSV
104. **import_menu_from_json** - Import menu data from JSON
105. **export_ingredients_list** - Export all ingredients
106. **import_ingredients_list** - Import ingredients from file

### Notification & Communication
107. **notify_location_of_change** - Send notification about menu changes
108. **broadcast_menu_update** - Broadcast menu update to all locations
109. **get_pending_notifications** - Get pending notifications

Add the item managment lik CRUD for the items not menut items

### Item Management (CRUD Operations)
110. **create_item** - Create a new item in the system
111. **read_item** - Get details of a specific item by ID
112. **update_item** - Update an existing item's details
113. **delete_item** - Delete an item from the system
114. **list_items** - Get all items with optional filtering
115. **search_items** - Search items by various criteria
116. **get_item_by_name** - Find an item by its name
117. **validate_item** - Validate item data before saving
118. **clone_item** - Create a copy of an existing item
119. **batch_create_items** - Create multiple items at once
120. **batch_update_items** - Update multiple items at once
121. **batch_delete_items** - Delete multiple items at once
