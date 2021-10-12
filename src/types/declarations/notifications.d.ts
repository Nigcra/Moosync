/* 
 *  notifications.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

interface NotificationObject {
  id: string
  type: 'info' | 'error'
  message: string
}

interface NotificationEvents {
  gotNotif: (notif: NotificationObject) => void
}